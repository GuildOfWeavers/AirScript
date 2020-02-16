"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contexts_1 = require("./contexts");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class Component2 {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(schema, traceWidth, constraintCount, template, symbols, auxRegisters) {
        this.schema = schema;
        this.inputRegisters = [];
        this.maskRegisters = [];
        this.segmentRegisters = [];
        this.auxRegisters = auxRegisters;
        this.traceWidth = traceWidth;
        this.constraintCount = constraintCount;
        this.cycleLength = 0; // TODO
        this.symbols = transformSymbols(symbols, traceWidth, this.auxRegisterOffset);
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
            inputs: this.inputRegisters.length,
            loops: this.maskRegisters.length,
            segments: this.segmentRegisters.length,
            aux: this.auxRegisters.length
        };
        const context = this.schema.createFunctionContext(specs.result, specs.handle);
        specs.params.forEach(p => context.addParam(p.dimensions, p.name));
        return new contexts_1.RootContext(domain, context, this.symbols, staticRegisters);
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
    buildRegisterSpecs() {
        // TODO
    }
}
exports.Component2 = Component2;
// HELPER FUNCTIONS
// ================================================================================================
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
//# sourceMappingURL=Component2.js.map