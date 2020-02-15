"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
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
        this.lastBlockId = 0;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    setInputs(inputs) {
        // TODO: remove
    }
    hasLocal(variable) {
        return false;
    }
    getNextId() {
        const id = `${utils_1.BLOCK_ID_PREFIX}${this.lastBlockId}`;
        this.lastBlockId++;
        return id;
    }
}
exports.RootContext = RootContext;
//# sourceMappingURL=RootContext.js.map