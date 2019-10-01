// IMPORTS
// ================================================================================================
import { ReadonlyRegisterSpecs, InputRegisterSpecs } from '@guildofweavers/air-script';
import { ScriptSpecs } from './ScriptSpecs';
import { validateVariableName, Dimensions } from './utils';
import { Expression, SymbolReference, SubroutineCall } from './expressions';

// CLASS DEFINITION
// ================================================================================================
export class ExecutionContext {

    readonly globalConstants        : Map<string, Expression>;
    readonly localVariables         : Map<string, SymbolReference>[];
    readonly subroutines            : Map<string, string>;
    readonly mutableRegisterCount   : number;
    readonly staticRegisters        : ReadonlyRegisterSpecs[];
    readonly secretRegisters        : InputRegisterSpecs[];
    readonly publicRegisters        : InputRegisterSpecs[];
    readonly tFunctionDegree?       : bigint[];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(specs: ScriptSpecs) {
        this.subroutines = new Map();
        this.localVariables = [new Map()];
        this.globalConstants = specs.globalConstants;
        this.mutableRegisterCount = specs.mutableRegisterCount;
        this.staticRegisters = specs.staticRegisters;
        this.secretRegisters = specs.secretRegisters;
        this.publicRegisters = specs.publicRegisters;
        if (specs.transitionFunction) {
            this.tFunctionDegree = specs.transitionFunctionDegree;
        }
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get canAccessFutureState(): boolean {
        // if transition function degree has been set, we are in transition constraints
        return (this.tFunctionDegree !== undefined);
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
    setVariableAssignment(variable: string, expression: Expression): SymbolReference {
        if (this.globalConstants.has(variable)) {
            throw new Error(`value of global constant '${variable}' cannot be changed`);
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
                sExpression = new SymbolReference(refCode, expression.dimensions, expression.degree);
                localVariables.set(variable, sExpression);
            }
        }
        else {
            if (this.getVariableReference(variable)) {
                throw new Error(`value of variable '${variable}' cannot be changed out of scope`);
            }

            validateVariableName(variable, expression.dimensions);
            sExpression = new SymbolReference(refCode, expression.dimensions, expression.degree);
            localVariables.set(variable, sExpression);
        }

        return sExpression;
    }

    private getVariableReference(variable: string): Expression | undefined {
        if (this.globalConstants.has(variable)) {
            // check for variable in global constants
            return this.globalConstants.get(variable)!;
        }
        else {
            // search for the variable in the local variable stack
            for (let i = this.localVariables.length - 1; i >= 0; i--) {
                let scope = this.localVariables[i];
                if (scope.has(variable)) {
                    return scope.get(variable)!;
                }
            }
        }
    }

    createNewVariableFrame() {
        this.localVariables.push(new Map());
    }

    destroyVariableFrame() {
        if (this.localVariables.length === 1) {
            throw new Error('cannot destroy last variable frame');
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

    // SUBROUTINES
    // --------------------------------------------------------------------------------------------
    getTransitionFunctionCall(): SubroutineCall {
        if (!this.canAccessFutureState) {
            throw new Error(`transition function cannot call itself recursively`);
        }
        const dimensions: Dimensions = [this.mutableRegisterCount, 0];
        return new SubroutineCall('applyTransition', ['r', 'k', 's', 'p', 'c'], dimensions, this.tFunctionDegree!);
    }
}