// IMPORTS
// ================================================================================================
import { ReadonlyRegisterSpecs, InputRegisterSpecs } from '@guildofweavers/air-script';
import { ScriptSpecs } from './ScriptSpecs';
import { validateVariableName, Dimensions } from './utils';
import { Expression, SymbolReference, SubroutineCall, ExtractVectorElement } from './expressions';

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

    readonly loopFrames             : (Set<number> | undefined)[];

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
        this.loopFrames = [];
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get canAccessFutureState(): boolean {
        // if transition function degree has been set, we are in transition constraints
        return (this.tFunctionDegree !== undefined);
    }
    
    get modifierDegree(): bigint {
        return BigInt(Math.ceil(Math.log2(this.loopFrames.length)));
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

    // INITIALIZERS
    // --------------------------------------------------------------------------------------------
    addLoopFrame(registers?: string[]): number {
        if (!registers) {
            return this.loopFrames.push(undefined) - 1;
        } 
        else {
            const lastFrame = this.loopFrames[this.loopFrames.length - 1];
            const newFrame = new Set<number>();
            for (let i = 0; i < registers.length; i++) {
                let regIdx = Number.parseInt(registers[i].slice(2), 10);
                if (lastFrame && !lastFrame.has(regIdx)) {
                    throw new Error('TODO');
                }
                newFrame.add(regIdx);
            }
    
            if (newFrame.size !== registers.length) {
                throw new Error('TODO');
            }
    
            return this.loopFrames.push(newFrame) - 1;
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
            if (bankLength === 0) throw new Error(`invalid register reference ${reference}: no $${bankName} registers have been defined`);
            else if (bankLength === 1) throw new Error(`invalid register reference ${reference}: only 1 $${bankName} register has been defined`);
            else throw new Error(`invalid register reference ${reference}: only ${bankLength} $${bankName} registers have been defined`);
        }
        else if (bankName === 'i') {
            const lastFrame = this.loopFrames[this.loopFrames.length - 1]!;
            if (!lastFrame.has(index)) {
                throw new Error(`register ${reference} is out of scope`);
            }
        }
        const bankRef = new SymbolReference(bankName, [bankLength, 0], new Array(bankLength).fill(1n));
        return new ExtractVectorElement(bankRef, index);
    }

    private getRegisterBankReference(reference: string): Expression {
        const bankName = reference.slice(1, 2);
        const bankLength = this.getRegisterBankLength(bankName);
        return new SymbolReference(bankName, [bankLength, 0], new Array(bankLength).fill(1n));
    }

    private getRegisterBankLength(bankName: string): number {
        const loopFrame = this.loopFrames[this.loopFrames.length - 1];
        if (bankName === 'i') {
            if (!loopFrame) {
                throw new Error(`$i registers cannot be accessed outside of init block`);
            }
            return this.loopFrames[0]!.size;
        }
        else if (loopFrame && this.loopFrames.length === 1) {
            throw new Error('TODO');
        }
        else if (bankName === 'n') {
            if (!this.canAccessFutureState) {
                throw new Error(`$n registers cannot be accessed in transition function`);
            }
            return this.mutableRegisterCount
        }
        else if (bankName === 'r')  return this.mutableRegisterCount;
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