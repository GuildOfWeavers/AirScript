"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class RootContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain, base, staticRegisters) {
        this.domain = domain;
        this.base = base;
        this.staticRegisters = staticRegisters;
        this.locals = new Map();
        this.inputs = new Set();
        this.statements = [];
    }
}
exports.RootContext = RootContext;
//# sourceMappingURL=RootContext.js.map