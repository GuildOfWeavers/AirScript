"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const utils_1 = require("../utils");
const expressions_1 = require("../expressions");
// CLASS DEFINITION
// ================================================================================================
class ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(specs, canAccessFutureState) {
        this.subroutines = new Map();
        this.localVariables = [new Map()];
        this.staticConstants = specs.staticConstants;
        this.mutableRegisterCount = specs.mutableRegisterCount;
        this.staticRegisters = specs.staticRegisters;
        this.secretRegisters = specs.secretRegisters;
        this.publicRegisters = specs.publicRegisters;
        this.canAccessFutureState = canAccessFutureState;
    }
    // VARIABLES
    // --------------------------------------------------------------------------------------------
    setVariableAssignment(variable, expression) {
        if (this.staticConstants.has(variable)) {
            throw new Error(`Value of static constant '${variable}' cannot be changed`);
        }
        // get the last frame from the local variable stack
        const localVariables = this.localVariables[this.localVariables.length - 1];
        const refCode = `$${variable}`;
        let sExpression = localVariables.get(variable);
        if (sExpression) {
            if (!sExpression.isSameDimensions(expression)) {
                throw new Error(`Dimensions of variable '${variable}' cannot be changed`);
            }
            if (sExpression.degree !== expression.degree) {
                sExpression = new expressions_1.VariableReference(refCode, expression.dimensions, expression.degree);
                localVariables.set(variable, sExpression);
            }
        }
        else {
            utils_1.validateVariableName(variable, expression.dimensions);
            sExpression = new expressions_1.VariableReference(refCode, expression.dimensions, expression.degree);
            localVariables.set(variable, sExpression);
        }
        return sExpression;
    }
    getVariableReference(variable) {
        // get the last frame from the local variable stack
        const localVariables = this.localVariables[this.localVariables.length - 1];
        if (localVariables.has(variable)) {
            return localVariables.get(variable);
        }
        else if (this.staticConstants.has(variable)) {
            return this.staticConstants.get(variable);
        }
        else {
            throw new Error(`Variable '${variable}' is not defined`);
        }
    }
    createNewVariableFrame() {
        this.localVariables.push(new Map());
    }
    destroyVariableFrame() {
        if (this.localVariables.length === 1) {
            throw new Error('Cannot destroy last variable frame');
        }
        this.localVariables.pop();
    }
    // REGISTERS
    // --------------------------------------------------------------------------------------------
    getRegisterReference(register) {
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
            let staticRegisterCount = this.staticRegisters.length;
            if (index >= staticRegisterCount) {
                throw new Error(`${errorMessage}: register index must be smaller than ${staticRegisterCount}`);
            }
        }
        else if (name === 's') {
            let secretRegisterCount = this.secretRegisters.length;
            if (index >= secretRegisterCount) {
                throw new Error(`${errorMessage}: register index must be smaller than ${secretRegisterCount}`);
            }
        }
        else if (name === 'p') {
            let publicRegisterCount = this.publicRegisters.length;
            if (index >= publicRegisterCount) {
                throw new Error(`${errorMessage}: register index must be smaller than ${publicRegisterCount}`);
            }
        }
        return new expressions_1.RegisterReference(`${name}[${index}]`);
    }
    isBinaryRegister(register) {
        const name = register.slice(1, 2);
        const index = Number.parseInt(register.slice(2), 10);
        if (name === 'k') {
            return this.staticRegisters[index].binary;
        }
        else if (name === 's') {
            return this.secretRegisters[index].binary;
        }
        else if (name === 'p') {
            return this.publicRegisters[index].binary;
        }
        else {
            throw new Error(`Register ${register} cannot be restricted to binary values`);
        }
    }
    // SUBROUTINES
    // --------------------------------------------------------------------------------------------
    addSubroutine(code) {
        const subName = `sub${this.subroutines.size}`;
        const subParams = this.getSubroutineParameters().join(', ');
        const subFunction = `function ${subName}(${subParams}) {\n${code}}\n`;
        this.subroutines.set(subName, subFunction);
        return subName;
    }
    callSubroutine(subName, outParamName) {
        const subParams = this.getSubroutineParameters();
        subParams[subParams.length - 1] = outParamName;
        return `${subName}(${subParams.join(', ')});\n`;
    }
    getSubroutineParameters() {
        if (this.canAccessFutureState) {
            return ['r', 'n', 'k', 's', 'p', 'out'];
        }
        else {
            return ['r', 'k', 's', 'p', 'out'];
        }
    }
}
exports.ExecutionContext = ExecutionContext;
//# sourceMappingURL=ExecutionContext.js.map