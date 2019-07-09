"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const utils_1 = require("./utils");
const Expression_1 = require("./expressions/Expression");
// CLASS DEFINITION
// ================================================================================================
class StatementContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(specs, canAccessFutureState) {
        this.subroutines = new Map();
        this.localVariables = new Map();
        this.staticConstants = specs.staticConstants;
        this.mutableRegisterCount = specs.mutableRegisterCount;
        this.presetRegisters = specs.presetRegisters;
        this.secretRegisters = specs.secretRegisters;
        this.publicRegisters = specs.publicRegisters;
        this.canAccessFutureState = canAccessFutureState;
    }
    // VARIABLES
    // --------------------------------------------------------------------------------------------
    buildVariableAssignment(variable, expression) {
        if (this.staticConstants.has(variable)) {
            throw new Error(`Value of static constant '${variable}' cannot be changed`);
        }
        const sExpression = this.localVariables.get(variable);
        if (sExpression) {
            if (!sExpression.isSameDimensions(expression)) {
                throw new Error(`Dimensions of variable '${variable}' cannot be changed`);
            }
            if (sExpression.degree !== expression.degree) {
                this.localVariables.set(variable, expression);
            }
            return {
                code: `$${variable}`,
                dimensions: expression.dimensions
            };
        }
        else {
            utils_1.validateVariableName(variable, expression.dimensions);
            this.localVariables.set(variable, expression);
            return {
                code: `let $${variable}`,
                dimensions: expression.dimensions
            };
        }
    }
    buildVariableReference(variable) {
        if (this.localVariables.has(variable)) {
            return this.localVariables.get(variable);
        }
        else if (this.staticConstants.has(variable)) {
            return this.staticConstants.get(variable);
        }
        else {
            throw new Error(`Variable '${variable}' is not defined`);
        }
    }
    // REGISTERS
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
            let presetRegisterCount = this.presetRegisters.length;
            if (index >= presetRegisterCount) {
                throw new Error(`${errorMessage}: register index must be smaller than ${presetRegisterCount}`);
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
        return Expression_1.Expression.register(name, index);
    }
    isBinaryRegister(register) {
        const name = register.slice(1, 2);
        const index = Number.parseInt(register.slice(2), 10);
        if (name === 'k') {
            return this.presetRegisters[index].binary;
        }
        else if (name === 's') {
            return this.secretRegisters[index].binary;
        }
        else if (name === 'p') {
            return this.publicRegisters[index].binary;
        }
        else {
            throw new Error(''); // TODO
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
exports.StatementContext = StatementContext;
//# sourceMappingURL=StatementContext.js.map