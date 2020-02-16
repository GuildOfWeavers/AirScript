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
        this.loopControllerMap = new Map();
        staticRegisters.loops.forEach((l, i) => this.loopControllerMap.set(pathToId(l.path), i));
        this.segmentControllerMap = new Map();
        staticRegisters.segments.forEach((s, i) => this.segmentControllerMap.set(pathToId(s.path), i));
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get loopOffset() {
        return this.staticRegisters.inputs.length;
    }
    get segmentOffset() {
        return this.staticRegisters.inputs.length + this.staticRegisters.loops.length;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    hasLocal(variable) {
        return false;
    }
    getNextId() {
        const id = `${utils_1.BLOCK_ID_PREFIX}${this.lastBlockId}`;
        this.lastBlockId++;
        return id;
    }
    getLoopControllerIndex(path) {
        const id = pathToId(path);
        return this.loopControllerMap.get(id); // TODO: check for undefined
    }
    getSegmentControllerIndex(path) {
        const id = pathToId(path);
        return this.segmentControllerMap.get(id); // TODO: check for undefined
    }
}
exports.RootContext = RootContext;
// HELPER FUNCTIONS
// ================================================================================================
function pathToId(path) {
    return path.join('');
}
//# sourceMappingURL=RootContext.js.map