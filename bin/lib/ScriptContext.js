"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class ScriptContext {
    constructor(steps, muRegisterCount, roRegisterCount, constraintCount, globalConstants, limits) {
        this.steps = validateSteps(steps, limits);
        this.mutableRegisterCount = validateMutableRegisterCount(muRegisterCount, limits);
        this.readonlyRegisterCount = validateReadonlyRegisterCount(roRegisterCount, limits);
        this.constraintCount = validateConstraintCount(constraintCount, limits);
        this.globalConstants = globalConstants;
        this.localVariables = new Map();
    }
    buildVariableAssignment(variable, dimensions) {
        if (this.globalConstants.has(variable)) {
            throw new Error(`Value of global constant '${variable}' cannot be changed`);
        }
        const sDimensions = this.localVariables.get(variable);
        if (sDimensions) {
            if (dimensions[0] !== sDimensions[0] || dimensions[1] !== sDimensions[1]) {
                throw new Error(`Dimensions of variable '${variable}' cannot be changed`);
            }
            return {
                code: `$${variable}`,
                dimensions: dimensions
            };
        }
        else {
            validateVariableName(variable, dimensions);
            this.localVariables.set(variable, dimensions);
            return {
                code: `let $${variable}`,
                dimensions: dimensions
            };
        }
    }
    buildVariableReference(variable) {
        if (this.localVariables.has(variable)) {
            return {
                code: `$${variable}`,
                dimensions: this.localVariables.get(variable)
            };
        }
        else if (this.globalConstants.has(variable)) {
            return {
                code: `g.${variable}`,
                dimensions: this.globalConstants.get(variable)
            };
        }
        else {
            throw new Error(`Variable '${variable}' is not defined`);
        }
    }
    buildRegisterReference(register) {
        const name = register.slice(1, 2);
        const index = Number.parseInt(register.slice(2), 10);
        if (name === 'r') {
            if (index >= this.mutableRegisterCount) {
                throw new Error(`Invalid register reference: register index must be smaller than ${this.mutableRegisterCount}`);
            }
        }
        else if (name === 'n') {
            if (false) {
                // TODO: add allowAccessToFuture as parameter?
                throw new Error('Transition function cannot reference future register states');
            }
            else if (index >= this.mutableRegisterCount) {
                throw new Error(`Invalid register reference: register index must be smaller than ${this.mutableRegisterCount}`);
            }
        }
        else if (name === 'k') {
            if (index >= this.readonlyRegisterCount) {
                throw new Error(`Invalid constant reference: constant index must be smaller than ${this.mutableRegisterCount}`);
            }
        }
        return `${name}[${index}]`;
    }
}
exports.ScriptContext = ScriptContext;
// HELPER FUNCTIONS
// ================================================================================================
function validateVariableName(variable, dimensions) {
    const errorMessage = `Variable name '${variable}' is invalid`;
    if (utils_1.isScalar(dimensions)) {
        if (variable != variable.toLowerCase()) {
            throw new Error(`${errorMessage}: scalar variable names cannot contain uppercase characters`);
        }
    }
    else if (utils_1.isVector(dimensions)) {
        if (variable != variable.toUpperCase()) {
            throw new Error(`${errorMessage}: vector variable names cannot contain lowercase characters`);
        }
    }
    else {
        if (variable != variable.toUpperCase()) {
            throw new Error(`${errorMessage}: matrix variable names cannot contain lowercase characters`);
        }
    }
}
exports.validateVariableName = validateVariableName;
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
exports.validateSteps = validateSteps;
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
exports.validateMutableRegisterCount = validateMutableRegisterCount;
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
exports.validateReadonlyRegisterCount = validateReadonlyRegisterCount;
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
exports.validateConstraintCount = validateConstraintCount;
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
exports.validateConstraintDegree = validateConstraintDegree;
//# sourceMappingURL=ScriptContext.js.map