// IMPORTS
// ================================================================================================
import { validateVariableName } from '../utils';
import { ScriptSpecs } from '../ScriptSpecs';
import { ReadonlyRegisterSpecs, InputRegisterSpecs } from '../registers';
import { Expression, SymbolReference } from '../expressions';

// CLASS DEFINITION
// ================================================================================================
export class ExecutionContext {

    readonly staticConstants        : Map<string, Expression>;
    readonly localVariables         : Map<string, SymbolReference>[];
    readonly subroutines            : Map<string, string>;
    readonly mutableRegisterCount   : number;
    readonly staticRegisters        : ReadonlyRegisterSpecs[];
    readonly secretRegisters        : InputRegisterSpecs[];
    readonly publicRegisters        : InputRegisterSpecs[];
    readonly canAccessFutureState   : boolean;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(specs: ScriptSpecs, canAccessFutureState: boolean) {
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
    getSymbolReference(symbol: string): Expression {
        if (symbol.startsWith('$')) {
            if (symbol.length > 2) {
                return this.getRegisterReference(symbol);
            }
            else {
                return this.getRegisterBankReference(symbol);
            }
        }
        else {
            return this.getVariableReference(symbol);
        }
    }


    // VARIABLES
    // --------------------------------------------------------------------------------------------
    setVariableAssignment(variable: string, expression: Expression): SymbolReference {
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
                sExpression = new SymbolReference(refCode, expression.dimensions, expression.degree);
                localVariables.set(variable, sExpression);
            }
        }
        else {
            validateVariableName(variable, expression.dimensions);
            sExpression = new SymbolReference(refCode, expression.dimensions, expression.degree);
            localVariables.set(variable, sExpression);
        }

        return sExpression;
    }

    private getVariableReference(variable: string): Expression {
        // get the last frame from the local variable stack
        const localVariables = this.localVariables[this.localVariables.length - 1];

        if (localVariables.has(variable)) {
            return localVariables.get(variable)!;
        }
        else if (this.staticConstants.has(variable)) {
            return this.staticConstants.get(variable)!;
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
    isBinaryRegister(register: string): boolean {
        const bankName = register.slice(1, 2);
        const index = Number.parseInt(register.slice(2), 10);

        if (bankName === 'k')       return this.staticRegisters[index].binary;
        else if (bankName === 's')  return this.secretRegisters[index].binary;
        else if (bankName === 'p')  return this.publicRegisters[index].binary;
        else throw new Error(`register ${register} cannot be restricted to binary values`);
    }

    private getRegisterReference(reference: string): Expression {
        const bankName = reference.slice(1, 2);
        const index = Number.parseInt(reference.slice(2), 10);
        
        const bankLength = this.getRegisterBankLength(bankName);
        if (index >= bankLength) {
            throw new Error(`invalid register reference ${reference}: register index must be smaller than ${bankLength}`);
        }
        else if (bankName === 'n' && !this.canAccessFutureState) {
            throw new Error(`invalid register reference ${reference}: transition function cannot reference future register states`);
        }

        return new SymbolReference(`${bankName}[${index}]`, [0, 0], 1n);
    }

    private getRegisterBankReference(reference: string): Expression {
        const bankName = reference.slice(1, 2);

        if (bankName === 'n' && !this.canAccessFutureState) {
            throw new Error(`invalid register reference ${reference}: transition function cannot reference future register states`);
        }

        const bankLength = this.getRegisterBankLength(bankName);
        return new SymbolReference(bankName, [bankLength, 0], new Array(bankLength).fill(1n));
    }

    private getRegisterBankLength(bankName: string): number {
        if (bankName === 'r')       return this.mutableRegisterCount;
        else if (bankName === 'n')  return this.mutableRegisterCount;
        else if (bankName === 'k')  return this.staticRegisters.length;
        else if (bankName === 's')  return this.secretRegisters.length;
        else if (bankName === 'p')  return this.publicRegisters.length;
        else throw new Error(`register bank name $${bankName} is invalid`);
    }
}