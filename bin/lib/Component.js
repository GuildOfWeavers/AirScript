"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contexts_1 = require("./contexts");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class Component {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(schema, procedures, symbols) {
        this.schema = schema;
        this.procedures = procedures;
        this.symbols = symbols;
        this.maskRegisters = procedures.maskRegisters;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get field() {
        return this.schema.field;
    }
    get inputRegisters() {
        return this.procedures.inputRegisters;
    }
    get segmentMasks() {
        return this.procedures.segmentMasks;
    }
    get cycleLength() {
        return this.procedures.segmentMasks[0].length;
    }
    get staticRegisterCount() {
        const param = this.procedures.transition.params.filter(p => p.name === utils_1.ProcedureParams.staticRow)[0];
        return param.dimensions[0];
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    createExecutionContext(procedure) {
        const specs = (procedure === 'transition')
            ? this.procedures.transition
            : this.procedures.evaluation;
        const staticRegisters = {
            inputs: this.inputRegisters.length,
            loops: this.maskRegisters.length,
            segments: this.segmentMasks.length,
            aux: this.staticRegisterCount - this.procedures.auxRegisterOffset
        };
        const traceWidth = this.procedures.transition.result[0];
        const domain = { start: 0, end: traceWidth };
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
}
exports.Component = Component;
//# sourceMappingURL=Component.js.map