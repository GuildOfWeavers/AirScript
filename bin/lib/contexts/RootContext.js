"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
// MODULE VARIABLES
// ================================================================================================
const MAX_PATH_LEG = 255;
// CLASS DEFINITION
// ================================================================================================
class RootContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain, base, symbols, inputs, staticRegisters) {
        this.domain = domain;
        this.base = base;
        this.staticRegisters = staticRegisters;
        this.inputs = inputs;
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
    get auxRegistersOffset() {
        return this.staticRegisters.inputs.length
            + this.staticRegisters.loops.length
            + this.staticRegisters.segments.length;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    hasLocal(variable) {
        return false;
    }
    getLocalHandle(variable) {
        return undefined;
    }
    getNextId() {
        const id = `${utils_1.BLOCK_ID_PREFIX}${this.lastBlockId}`;
        this.lastBlockId++;
        return id;
    }
    getLoopControllerIndex(path) {
        const id = pathToId(path);
        const index = this.loopControllerMap.get(id);
        if (index === undefined) {
            throw new Error(`path ${path} did not resolve to a loop controller index`);
        }
        return index;
    }
    getSegmentControllerIndex(path) {
        const id = pathToId(path);
        const index = this.segmentControllerMap.get(id);
        if (index === undefined) {
            throw new Error(`path ${path} did not resolve to a segment controller index`);
        }
        return index;
    }
}
exports.RootContext = RootContext;
// HELPER FUNCTIONS
// ================================================================================================
function pathToId(path) {
    const buffer = Buffer.allocUnsafe(path.length);
    let offset = 0;
    for (let leg of path) {
        if (leg > MAX_PATH_LEG || leg < 0) {
            throw new Error(`invalid path leg in path ${path}: all path legs must be integers between 0 and ${MAX_PATH_LEG}`);
        }
        offset = buffer.writeUInt8(leg, offset);
    }
    return buffer.toString('hex');
    ;
}
//# sourceMappingURL=RootContext.js.map