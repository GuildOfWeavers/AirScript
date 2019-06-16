"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class ScriptSpecs {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(limits) {
        this.limits = limits;
    }
    // PROPERTY SETTERS
    // --------------------------------------------------------------------------------------------
    setField(value) {
        this.field = value;
    }
    setSteps(value) {
        this.steps = validateSteps(value, this.limits);
    }
    setMutableRegisterCount(value) {
        this.mutableRegisterCount = validateMutableRegisterCount(value, this.limits);
    }
    setReadonlyRegisterCount(value) {
        this.readonlyRegisterCount = validateReadonlyRegisterCount(value, this.limits);
    }
    setConstraintCount(value) {
        this.constraintCount = validateConstraintCount(value, this.limits);
    }
    setMaxConstraintDegree(value) {
        this.maxConstraintDegree = validateConstraintDegree(value, this.limits);
    }
    setGlobalConstants(value) {
        this.globalConstants = value;
    }
}
exports.ScriptSpecs = ScriptSpecs;
// HELPER FUNCTIONS
// ================================================================================================
function validateSteps(steps, limits) {
    if (steps > limits.maxSteps) {
        throw new Error(`Number of steps cannot exceed ${limits.maxSteps}`);
    }
    else if (steps < 0) {
        throw new Error('Number of steps must be greater than 0');
    }
    else if (!utils_1.isPowerOf2(steps)) {
        throw new Error('Number of steps must be a power of 2');
    }
    else if (typeof steps === 'bigint') {
        steps = Number.parseInt(steps);
    }
    return steps;
}
function validateMutableRegisterCount(registerCount, limits) {
    if (registerCount > limits.maxMutableRegisters) {
        throw new Error(`Number of mutable registers cannot exceed ${limits.maxMutableRegisters}`);
    }
    else if (registerCount < 0) {
        throw new Error('Number of mutable registers must be positive');
    }
    else if (registerCount == 0) {
        throw new Error('You must define at least one mutable register');
    }
    else if (typeof registerCount === 'bigint') {
        registerCount = Number.parseInt(registerCount);
    }
    return registerCount;
}
function validateReadonlyRegisterCount(registerCount, limits) {
    if (registerCount > limits.maxReadonlyRegisters) {
        throw new Error(`Number of readonly registers cannot exceed ${limits.maxReadonlyRegisters}`);
    }
    else if (registerCount < 0) {
        throw new Error('Number of readonly registers must be positive');
    }
    else if (typeof registerCount === 'bigint') {
        registerCount = Number.parseInt(registerCount);
    }
    return registerCount;
}
function validateConstraintCount(constraintCount, limits) {
    if (constraintCount > limits.maxConstraintCount) {
        throw new Error(`Number of transition constraints cannot exceed ${limits.maxConstraintCount}`);
    }
    else if (constraintCount < 0) {
        throw new Error('Number of transition constraints must be positive');
    }
    else if (constraintCount == 0) {
        throw new Error('You must define at least one transition constraint');
    }
    else if (typeof constraintCount === 'bigint') {
        constraintCount = Number.parseInt(constraintCount);
    }
    return constraintCount;
}
function validateConstraintDegree(constraintDegree, limits) {
    if (constraintDegree > limits.maxConstraintDegree) {
        throw new Error(`Degree of transition constraints cannot exceed ${limits.maxConstraintDegree}`);
    }
    else if (constraintDegree < 0) {
        throw new Error('Degree of transition constraints must be positive');
    }
    else if (constraintDegree == 0) {
        throw new Error('Degree of transition constraints cannot be 0');
    }
    else if (typeof constraintDegree === 'bigint') {
        constraintDegree = Number.parseInt(constraintDegree);
    }
    return constraintDegree;
}
//# sourceMappingURL=ScriptSpecs.js.map