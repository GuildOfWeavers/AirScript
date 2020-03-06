"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const templates_1 = require("./templates");
const contexts_1 = require("./contexts");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class Component {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(schema, traceWidth, constraintCount, template, symbols, auxRegisters) {
        this.schema = schema;
        this.traceWidth = traceWidth;
        this.constraintCount = constraintCount;
        this.symbols = symbols;
        this.inputRegisters = [];
        this.maskRegisters = [];
        this.segmentRegisters = [];
        this.auxRegisters = auxRegisters;
        this.inputRankMap = extractInputs(symbols);
        this.cycleLength = this.buildRegisterSpecs(template, [0]);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get field() {
        return this.schema.field;
    }
    get loopRegisterOffset() {
        return this.inputRegisters.length;
    }
    get segmentRegisterOffset() {
        return this.inputRegisters.length
            + this.maskRegisters.length
            + this.segmentRegisters.length;
    }
    get auxRegisterOffset() {
        return this.inputRegisters.length
            + this.maskRegisters.length
            + this.segmentRegisters.length;
    }
    get staticRegisterCount() {
        return this.inputRegisters.length
            + this.maskRegisters.length
            + this.segmentRegisters.length
            + this.auxRegisters.length;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    createExecutionContext(procedure) {
        const specs = this.getProcedureSpecs(procedure);
        const domain = [0, this.traceWidth];
        const staticRegisters = {
            inputs: this.inputRegisters,
            loops: this.maskRegisters,
            segments: this.segmentRegisters,
            aux: this.auxRegisters
        };
        const context = this.schema.createFunctionContext(specs.result, specs.handle);
        const symbols = transformSymbols(this.symbols, this.traceWidth, this.auxRegisterOffset);
        specs.params.forEach(p => context.addParam(p.dimensions, p.name));
        return new contexts_1.RootContext(domain, context, symbols, this.inputRankMap, staticRegisters);
    }
    setTransitionFunction(context, result) {
        this.schema.addFunction(context.base, context.statements, result);
    }
    setConstraintEvaluator(context, result) {
        this.schema.addFunction(context.base, context.statements, result);
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    getProcedureSpecs(procedure) {
        if (procedure === 'transition') {
            return {
                handle: utils_1.TRANSITION_FN_HANDLE,
                result: [this.traceWidth, 0],
                params: [
                    { name: utils_1.ProcedureParams.thisTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: utils_1.ProcedureParams.staticRow, dimensions: [this.staticRegisterCount, 0] }
                ]
            };
        }
        else if (procedure === 'evaluation') {
            return {
                handle: utils_1.EVALUATION_FN_HANDLE,
                result: [this.constraintCount, 0],
                params: [
                    { name: utils_1.ProcedureParams.thisTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: utils_1.ProcedureParams.nextTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: utils_1.ProcedureParams.staticRow, dimensions: [this.staticRegisterCount, 0] }
                ]
            };
        }
        else {
            throw new Error(`cannot build specs for '${procedure}' procedure`);
        }
    }
    buildRegisterSpecs(loop, path, masterParent) {
        if (loop.isLeaf) {
            return this.processLeafLoop(loop, path, masterParent);
        }
        // build input registers for this loop
        const inputOffset = this.inputRegisters.length;
        const masterPeer = { relation: 'peerof', index: inputOffset };
        let isAnchor = true;
        for (let inputName of loop.ownInputs) {
            const symbol = this.symbols.get(inputName);
            utils_1.validate(symbol !== undefined, errors.undeclaredInput(inputName));
            utils_1.validate(utils_1.isInputInfoSymbol(symbol), errors.invalidLoopInput(inputName));
            utils_1.validate(symbol.rank === loop.rank, errors.inputRankMismatch(inputName));
            for (let k = 0; k < (symbol.dimensions[0] || 1); k++) {
                this.inputRegisters.push({
                    scope: symbol.scope,
                    binary: symbol.binary,
                    master: isAnchor ? masterParent : masterPeer
                });
                isAnchor = false;
            }
        }
        // add mask register for the loop
        this.maskRegisters.push({
            input: inputOffset,
            path: path
        });
        // process all inner loops
        let cycleLength = 0;
        const master = { relation: 'childof', index: masterPeer.index };
        loop.blocks.forEach((block, i) => {
            // TODO: add support for delegate calls in higher-level loops
            utils_1.validate(block instanceof templates_1.LoopTemplate, errors.nonLeafDelegNotSupported());
            const cl = this.buildRegisterSpecs(block, path.concat(i), master);
            if (cl > cycleLength) {
                cycleLength = cl;
            }
        });
        return cycleLength;
    }
    processLeafLoop(loop, path, master) {
        // process inner blocks of the loop and determine cycle length
        let cycleLength;
        loop.blocks.forEach((block, i) => {
            if (block instanceof templates_1.LoopBaseTemplate) {
                if (cycleLength === undefined) {
                    cycleLength = block.cycleLength;
                }
                utils_1.validate(cycleLength === block.cycleLength, errors.cycleLengthMismatch());
                block.masks.forEach((mask, j) => {
                    this.segmentRegisters.push({ mask, path: path.concat([j]) });
                });
            }
            else if (block instanceof templates_1.DelegateTemplate) {
                // TODO: find a way to get delegate info without hard-coding name
                const delegate = this.symbols.get(`${block.delegate}_transition`);
                utils_1.validate(delegate !== undefined, errors.undeclaredDelegate(block.delegate));
                utils_1.validate(utils_1.isFunctionInfoSymbol(delegate), errors.invalidDelegate(block.delegate));
                //validate(delegate.rank === 0, errors.delegateRankMismatch(block.delegate));
                if (cycleLength === undefined) {
                    cycleLength = delegate.cycleLength;
                }
                utils_1.validate(cycleLength === delegate.cycleLength, errors.cycleLengthMismatch());
            }
            else {
                throw new Error(`invalid block detected within a leaf loop`);
            }
        });
        utils_1.validate(cycleLength !== undefined, 'cycle length could not be determined');
        const loopDepth = loop.getDepth(this.inputRankMap);
        if (loopDepth === 0) {
            this.addLeafInputs(loop, path, cycleLength, master);
        }
        else {
            this.addLinearInputs(loop, path, cycleLength, master);
        }
        return cycleLength;
    }
    addLeafInputs(loop, path, cycleLength, master) {
        // process block inputs
        const inputOffset = this.inputRegisters.length;
        for (let inputName of loop.ownInputs) {
            const symbol = this.symbols.get(inputName);
            utils_1.validate(symbol !== undefined, errors.undeclaredInput(inputName));
            utils_1.validate(symbol.type === 'input', errors.invalidLoopInput(inputName));
            utils_1.validate(symbol.rank === loop.rank, errors.inputRankMismatch(inputName));
            for (let k = 0; k < (symbol.dimensions[0] || 1); k++) {
                this.inputRegisters.push({
                    scope: symbol.scope,
                    binary: symbol.binary,
                    master: master,
                    steps: cycleLength
                });
            }
        }
        // add mask register for the loop
        this.maskRegisters.push({
            input: inputOffset,
            path: path
        });
    }
    addLinearInputs(loop, path, cycleLength, master) {
        const groupedInputs = this.groupLinearInputs(loop.ownInputs);
        let masterParent = master;
        for (let i = 0; i < groupedInputs.length; i++) {
            let isBottom = (i === groupedInputs.length - 1);
            let isAnchor = true;
            let inputOffset = this.inputRegisters.length;
            let masterPeer = { relation: 'peerof', index: inputOffset };
            for (let input of groupedInputs[i]) {
                let steps = isBottom ? cycleLength : undefined;
                if (input.rank === -1) {
                    steps = 1;
                }
                for (let k = 0; k < (input.dimensions[0] || 1); k++) {
                    this.inputRegisters.push({
                        scope: input.scope,
                        binary: input.binary,
                        master: isAnchor || isBottom ? masterParent : masterPeer,
                        steps: steps
                    });
                    isAnchor = false;
                }
            }
            this.maskRegisters.push({
                input: inputOffset,
                path: path
            });
            path = path.concat(0);
            masterParent = { relation: 'childof', index: inputOffset };
        }
    }
    groupLinearInputs(inputNames) {
        const result = [];
        const bottomInputs = [];
        for (let inputName of inputNames) {
            const symbol = this.symbols.get(inputName);
            utils_1.validate(symbol !== undefined, errors.undeclaredInput(inputName));
            utils_1.validate(utils_1.isInputInfoSymbol(symbol), errors.invalidLoopInput(inputName));
            let rank = symbol.rank;
            if (rank === -1) {
                bottomInputs.push(symbol);
                continue;
            }
            if (result[rank] === undefined) {
                result[rank] = [];
            }
            result[rank].push(symbol);
        }
        if (bottomInputs.length > 0) {
            result.push(bottomInputs);
        }
        return result;
    }
}
exports.Component = Component;
// HELPER FUNCTIONS
// ================================================================================================
function extractInputs(symbols) {
    const bottomInputs = [];
    const inputs = new Map();
    let maxRank = 0;
    for (let [symbol, info] of symbols) {
        if (utils_1.isInputInfoSymbol(info)) {
            if (info.rank === -1) {
                bottomInputs.push(symbol);
            }
            else {
                inputs.set(symbol, info.rank);
                if (info.rank > maxRank) {
                    maxRank = info.rank;
                }
            }
        }
    }
    for (let input of bottomInputs) {
        inputs.set(input, maxRank + 1);
    }
    return inputs;
}
function transformSymbols(symbols, traceWidth, staticOffset) {
    const result = new Map();
    const type = 'param';
    // transform custom symbols
    for (let [symbol, info] of symbols) {
        if (info.type === 'const' || info.type === 'func') {
            result.set(symbol, info);
        }
        else if (info.type === 'input') {
            result.set(symbol, { ...info, type, handle: utils_1.ProcedureParams.staticRow });
        }
        else if (info.type === 'static') {
            let offset = info.offset + staticOffset;
            result.set(symbol, { ...info, type, handle: utils_1.ProcedureParams.staticRow, offset });
        }
        else {
            throw new Error(`cannot transform ${info.type} symbol to component form`);
        }
    }
    // create symbols for trace rows
    let dimensions = [traceWidth, 0];
    let subset = false;
    result.set('$r', { type, handle: utils_1.ProcedureParams.thisTraceRow, dimensions, subset });
    result.set('$n', { type, handle: utils_1.ProcedureParams.nextTraceRow, dimensions, subset });
    // create symbols for trace registers
    dimensions = [0, 0];
    subset = true;
    for (let i = 0; i < traceWidth; i++) {
        result.set(`$r${i}`, { type, handle: utils_1.ProcedureParams.thisTraceRow, offset: i, dimensions, subset });
        result.set(`$n${i}`, { type, handle: utils_1.ProcedureParams.nextTraceRow, offset: i, dimensions, subset });
    }
    return result;
}
// ERRORS
// ================================================================================================
const errors = {
    undeclaredInput: (r) => `input '${r}' is used without being declared`,
    invalidLoopInput: (s) => `symbol '${s}' cannot be used in loop header`,
    inputRankMismatch: (s) => `rank of input '${s}' does not match loop depth`,
    blockTypeConflict: (t) => `cannot add block of type ${t.name} to loop template`,
    undeclaredDelegate: (d) => `function '${d}' is used without being imported`,
    invalidDelegate: (s) => `symbol '${s}' is not a function`,
    delegateRankMismatch: (d) => `rank of function '${d}' does not match loop depth`,
    nonLeafDelegNotSupported: () => `function calls in non-leaf input loops are not yet supported`,
    cycleLengthMismatch: () => `all domains within an input loop must have the same cycle length`
};
//# sourceMappingURL=Component.js.map