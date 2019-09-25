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
    // SYMBOLIC REFERENCES
    // --------------------------------------------------------------------------------------------
    getSymbolReference(symbol) {
        if (symbol.startsWith('$')) {
            if (symbol.length > 2) {
                return this.getRegisterReference(symbol);
            }
            else {
                return this.getRegisterBankReference(symbol);
            }
        }
        else {
            const ref = this.getVariableReference(symbol);
            if (!ref) {
                throw new Error(`variable '${symbol}' is not defined`);
            }
            else {
                return ref;
            }
        }
    }
    // VARIABLES
    // --------------------------------------------------------------------------------------------
    setVariableAssignment(variable, expression) {
        if (this.staticConstants.has(variable)) {
            throw new Error(`value of static constant '${variable}' cannot be changed`);
        }
        // get the last frame from the local variable stack
        const localVariables = this.localVariables[this.localVariables.length - 1];
        const refCode = `$${variable}`;
        let sExpression = localVariables.get(variable);
        if (sExpression) {
            if (!sExpression.isSameDimensions(expression)) {
                throw new Error(`dimensions of variable '${variable}' cannot be changed`);
            }
            if (sExpression.degree !== expression.degree) {
                sExpression = new expressions_1.SymbolReference(refCode, expression.dimensions, expression.degree);
                localVariables.set(variable, sExpression);
            }
        }
        else {
            if (this.getVariableReference(variable)) {
                throw new Error(`value of variable '${variable}' cannot be changed out of scope`);
            }
            utils_1.validateVariableName(variable, expression.dimensions);
            sExpression = new expressions_1.SymbolReference(refCode, expression.dimensions, expression.degree);
            localVariables.set(variable, sExpression);
        }
        return sExpression;
    }
    getVariableReference(variable) {
        if (this.staticConstants.has(variable)) {
            // check for variable in global constants
            return this.staticConstants.get(variable);
        }
        else {
            // search for the variable in the local variable stack
            for (let i = this.localVariables.length - 1; i >= 0; i--) {
                let scope = this.localVariables[i];
                if (scope.has(variable)) {
                    return scope.get(variable);
                }
            }
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
    isBinaryRegister(register) {
        const bankName = register.slice(1, 2);
        const index = Number.parseInt(register.slice(2), 10);
        if (bankName === 'k')
            return this.staticRegisters[index].binary;
        else if (bankName === 's')
            return this.secretRegisters[index].binary;
        else if (bankName === 'p')
            return this.publicRegisters[index].binary;
        else
            throw new Error(`register ${register} cannot be restricted to binary values`);
    }
    getRegisterReference(reference) {
        const bankName = reference.slice(1, 2);
        const index = Number.parseInt(reference.slice(2), 10);
        const bankLength = this.getRegisterBankLength(bankName);
        if (index >= bankLength) {
            throw new Error(`invalid register reference ${reference}: register index must be smaller than ${bankLength}`);
        }
        else if (bankName === 'n' && !this.canAccessFutureState) {
            throw new Error(`invalid register reference ${reference}: transition function cannot reference future register states`);
        }
        return new expressions_1.SymbolReference(`${bankName}[${index}]`, [0, 0], 1n);
    }
    getRegisterBankReference(reference) {
        const bankName = reference.slice(1, 2);
        if (bankName === 'n' && !this.canAccessFutureState) {
            throw new Error(`invalid register reference ${reference}: transition function cannot reference future register states`);
        }
        const bankLength = this.getRegisterBankLength(bankName);
        return new expressions_1.SymbolReference(bankName, [bankLength, 0], new Array(bankLength).fill(1n));
    }
    getRegisterBankLength(bankName) {
        if (bankName === 'r')
            return this.mutableRegisterCount;
        else if (bankName === 'n')
            return this.mutableRegisterCount;
        else if (bankName === 'k')
            return this.staticRegisters.length;
        else if (bankName === 's')
            return this.secretRegisters.length;
        else if (bankName === 'p')
            return this.publicRegisters.length;
        else
            throw new Error(`register bank name $${bankName} is invalid`);
    }
}
exports.ExecutionContext = ExecutionContext;
//# sourceMappingURL=ExecutionContext.js.map