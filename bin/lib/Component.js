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
        this.cycleLength = 0;
        this.buildRegisterSpecs(template, [0]);
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
        const inputs = extractInputs(this.symbols);
        const symbols = transformSymbols(this.symbols, this.traceWidth, this.auxRegisterOffset);
        specs.params.forEach(p => context.addParam(p.dimensions, p.name));
        return new contexts_1.RootContext(domain, context, symbols, inputs, staticRegisters);
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
        const inputOffset = this.inputRegisters.length;
        const masterPeer = { relation: 'peerof', index: inputOffset };
        const cycleLength = getCycleLength(loop, this.symbols);
        if (cycleLength !== undefined && this.cycleLength < cycleLength) {
            this.cycleLength = cycleLength;
        }
        // build input registers for this loop
        let isAnchor = true;
        for (let inputName of loop.ownInputs) {
            const symbol = this.symbols.get(inputName);
            utils_1.validate(symbol !== undefined, errors.undeclaredInput(inputName));
            utils_1.validate(symbol.type === 'input', errors.invalidLoopInput(inputName));
            utils_1.validate(symbol.rank === loop.rank, errors.inputRankMismatch(inputName));
            for (let k = 0; k < (symbol.dimensions[0] || 1); k++) {
                this.inputRegisters.push({
                    scope: symbol.scope,
                    binary: symbol.binary,
                    master: isAnchor || loop.isLeaf ? masterParent : masterPeer,
                    steps: cycleLength
                });
                isAnchor = false;
            }
        }
        // add mask register for the loop
        this.maskRegisters.push({
            input: inputOffset,
            path: path
        });
        // recurse down for all child blocks
        const master = { relation: 'childof', index: masterPeer.index };
        loop.blocks.forEach((block, i) => {
            if (block instanceof templates_1.LoopTemplate) {
                this.buildRegisterSpecs(block, path.concat(i), master);
            }
            else if (block instanceof templates_1.LoopBaseTemplate) {
                block.masks.forEach((mask, j) => {
                    this.segmentRegisters.push({ mask, path: path.concat([j]) });
                });
            }
            else {
                // TODO: delegate
            }
        });
    }
}
exports.Component = Component;
// HELPER FUNCTIONS
// ================================================================================================
function extractInputs(symbols) {
    const inputs = new Set();
    for (let [key, symbol] of symbols) {
        if (symbol.type === 'input') {
            inputs.add(key);
        }
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
function getCycleLength(loop, symbols) {
    if (!loop.isLeaf)
        return undefined;
    let cycleLength = 0;
    for (let block of loop.blocks) {
        if (block instanceof templates_1.LoopBaseTemplate) {
            if (block.cycleLength > cycleLength) {
                cycleLength = block.cycleLength;
            }
        }
        else if (block instanceof templates_1.DelegateTemplate) {
            const handle = `${block.delegate}${utils_1.TRANSITION_FN_POSTFIX}`; // TODO: don't hardcode postfix
            const info = symbols.get(handle); // TODO: check for undefined
            if (utils_1.isFunctionInfoSymbol(info)) {
                if (info.cycleLength > cycleLength) {
                    cycleLength = info.cycleLength;
                }
            }
        }
    }
    return cycleLength;
}
// ERRORS
// ================================================================================================
const errors = {
    undeclaredInput: (r) => `input '${r}' is used without being declared`,
    invalidLoopInput: (s) => `symbol '${s}' cannot be used in loop header`,
    inputRankMismatch: (s) => `rank of input '${s}' does not match loop depth`,
    blockTypeConflict: (t) => `cannot add block of type ${t.name} to loop template`
};
//# sourceMappingURL=Component.js.map