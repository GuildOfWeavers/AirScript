"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
// EXECUTION CONTEXT CLASS
// ================================================================================================
class ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(id, parent, domain, inputs) {
        this.id = id;
        this.base = parent.base;
        this.statements = parent.statements;
        this.staticRegisters = parent.staticRegisters;
        this.rank = (parent instanceof ExecutionContext ? parent.rank : 0);
        if (domain) {
            // TODO: narrow domain
            this.domain = parent.domain;
        }
        else {
            this.domain = parent.domain;
        }
        if (inputs) {
            // TODO: narrow inputs
            this.inputs = parent.inputs;
        }
        else {
            this.inputs = parent.inputs;
        }
        this.locals = new Map();
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get loopOffset() {
        return this.staticRegisters.inputs;
    }
    get segmentOffset() {
        return this.staticRegisters.inputs + this.staticRegisters.loops;
    }
    // CONTROLLERS
    // --------------------------------------------------------------------------------------------
    getLoopController(loopIdx) {
        loopIdx = this.loopOffset + loopIdx;
        let result = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, loopIdx);
        return result;
    }
    getSegmentController(segmentIdx) {
        segmentIdx = this.segmentOffset + segmentIdx;
        let result = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, segmentIdx);
        return result;
    }
    // LOCAL VARIABLES
    // --------------------------------------------------------------------------------------------
    hasLocal(variable) {
        return this.locals.has(`${this.id}_${variable}`);
    }
    setLocal(variable, value) {
        const handle = `${this.id}_${variable}`;
        if (!this.locals.has(handle)) {
            this.locals.set(handle, this.locals.size);
            this.base.addLocal(value.dimensions, handle);
        }
        return this.base.buildStoreOperation(handle, value);
    }
    loadLocal(variable) {
        const handle = `${this.id}_${variable}`;
        utils_1.validate(this.locals.has(handle), errors.undeclaredVarReference(variable));
        return this.base.buildLoadExpression(`load.local`, handle);
    }
    getLocalIndex(variable) {
        return this.locals.get(`${this.id}_${variable}`);
    }
}
exports.ExecutionContext = ExecutionContext;
// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference: (s) => `variable ${s} is referenced before declaration`
};
//# sourceMappingURL=Context2.js.map