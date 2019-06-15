"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class StatementBlockContext {
    constructor(globals, registerCount, constantCount, canAccessFuture) {
        this.globals = globals;
        this.variables = new Map();
        this.registerCount = registerCount;
        this.constantCount = constantCount;
        this.canAccessFuture = canAccessFuture;
    }
    setVariableDimensions(variable, dimensions) {
        if (this.globals.has(variable)) {
            throw new Error(`Value of global constant '${variable}' cannot be changed`);
        }
        const sDimensions = this.variables.get(variable);
        if (sDimensions) {
            if (dimensions[0] !== sDimensions[0] || dimensions[1] !== sDimensions[1]) {
                throw new Error(`Dimensions of variable '${variable}' cannot be changed`);
            }
        }
        else {
            validateVariableName(variable, dimensions);
            this.variables.set(variable, dimensions);
        }
    }
    getVariableDimensions(variable) {
        return this.variables.get(variable) || this.globals.get(variable);
    }
    buildRegisterReference(register) {
        const name = register.slice(1, 2);
        const index = Number.parseInt(register.slice(2), 10);
        if (name === 'r') {
            if (index >= this.registerCount) {
                throw new Error(`Invalid register reference: register index must be smaller than ${this.registerCount}`);
            }
        }
        else if (name === 'n') {
            if (!this.canAccessFuture) {
                throw new Error('Transition function cannot reference future register states');
            }
            else if (index >= this.registerCount) {
                throw new Error(`Invalid register reference: register index must be smaller than ${this.registerCount}`);
            }
        }
        else if (name === 'k') {
            if (index >= this.constantCount) {
                throw new Error(`Invalid constant reference: constant index must be smaller than ${this.registerCount}`);
            }
        }
        return `${name}[${index}]`;
    }
}
exports.StatementBlockContext = StatementBlockContext;
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
//# sourceMappingURL=StatementBlockContext.js.map