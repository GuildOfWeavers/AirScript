"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class StatementContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(globalConstants, muRegisterCount, roRegisterCount, canAccessFutureState) {
        this.globalConstants = globalConstants;
        this.localVariables = new Map();
        this.mutableRegisterCount = muRegisterCount;
        this.readonlyRegisterCount = roRegisterCount;
        this.canAccessFutureState = canAccessFutureState;
    }
    // VARIABLE METHODS
    // --------------------------------------------------------------------------------------------
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
            utils_1.validateVariableName(variable, dimensions);
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
    // REGISTER METHODS
    // --------------------------------------------------------------------------------------------
    buildRegisterReference(register) {
        const name = register.slice(1, 2);
        const index = Number.parseInt(register.slice(2), 10);
        const errorMessage = `Invalid register reference ${register}`;
        if (name === 'r') {
            if (index >= this.mutableRegisterCount) {
                throw new Error(`${errorMessage}: register index must be smaller than ${this.mutableRegisterCount}`);
            }
        }
        else if (name === 'n') {
            if (!this.canAccessFutureState) {
                throw new Error(`${errorMessage}: transition function cannot reference future register states`);
            }
            else if (index >= this.mutableRegisterCount) {
                throw new Error(`${errorMessage}: register index must be smaller than ${this.mutableRegisterCount}`);
            }
        }
        else if (name === 'k') {
            if (index >= this.readonlyRegisterCount) {
                throw new Error(`${errorMessage}: register index must be smaller than ${this.readonlyRegisterCount}`);
            }
        }
        // TODO: add handling of secret and public input registers
        return `${name}[${index}]`;
    }
}
exports.StatementContext = StatementContext;
//# sourceMappingURL=StatementContext.js.map