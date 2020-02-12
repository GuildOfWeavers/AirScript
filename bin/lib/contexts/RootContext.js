"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class RootContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain, base, symbols, staticRegisters) {
        this.domain = domain;
        this.base = base;
        this.staticRegisters = staticRegisters;
        this.inputs = new Set();
        this.locals = new Set();
        this.statements = [];
        this.symbols = symbols;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    hasLocal(variable) {
        return false;
    }
}
exports.RootContext = RootContext;
//# sourceMappingURL=RootContext.js.map