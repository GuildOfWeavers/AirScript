"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const air_assembly_1 = require("@guildofweavers/air-assembly");
// CLASS DEFINITION
// ================================================================================================
class ModuleContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name, modulus, registers, constraints, segments) {
        this.name = name;
        this.schema = new air_assembly_1.AirSchema('prime', modulus);
        this.segments = segments;
        const steps = this.segments.reduce((p, c) => c.cycleLength > p ? c.cycleLength : p, 0);
        this.component = this.schema.createComponent(this.name, registers, constraints, steps);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addConstant(name, value) {
        //TODO: validateVariableName(name, dimensions);
        this.schema.addConstant(value, `$${name}`);
    }
    addInput(name, scope, binary = false, parent) {
        // TODO
        this.component.addInputRegister(scope, binary, undefined, 64);
    }
    addStatic(name, values) {
        // TODO: check name
        this.component.addCyclicRegister(values);
    }
}
exports.ModuleContext = ModuleContext;
//# sourceMappingURL=ModuleContext.js.map