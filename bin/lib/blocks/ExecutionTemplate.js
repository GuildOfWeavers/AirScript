"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class ExecutionTemplate {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(root, symbols) {
        this.registers = { inputs: [], masks: [], segments: [] };
        root.buildRegisterSpecs(this.registers, symbols, [0]);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get cycleLength() {
        // TODO
        return this.registers.segments[0].mask.length;
    }
    get auxRegisterOffset() {
        return this.registers.inputs.length
            + this.registers.masks.length
            + this.registers.segments.length;
    }
}
exports.ExecutionTemplate = ExecutionTemplate;
//# sourceMappingURL=ExecutionTemplate.js.map