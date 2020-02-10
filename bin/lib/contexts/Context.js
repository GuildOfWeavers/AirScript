"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class Context {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(id, domain, inputs, context) {
        this.id = id;
        this.domain = domain;
        this.inputs = inputs;
        this.context = context;
        this.locals = new Map();
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    hasLocal(variable) {
        return this.locals.has(`${this.id}_${variable}`);
    }
    setLocal(variable, value) {
        const handle = `${this.id}_${variable}`;
        if (!this.locals.has(handle)) {
            this.locals.set(handle, this.locals.size);
            this.context.addLocal(value.dimensions, handle);
        }
        return this.context.buildStoreOperation(handle, value);
    }
    loadLocal(variable) {
        const handle = `${this.id}_${variable}`;
        utils_1.validate(this.locals.has(handle), errors.undeclaredVarReference(variable));
        return this.context.buildLoadExpression(`load.local`, handle);
    }
    getLocalIndex(variable) {
        return this.locals.get(`${this.id}_${variable}`);
    }
}
exports.Context = Context;
// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference: (s) => `variable ${s} is referenced before declaration`
};
//# sourceMappingURL=Context.js.map