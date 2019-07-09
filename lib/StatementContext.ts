// IMPORTS
// ================================================================================================
import { Dimensions, validateVariableName, areSameDimension } from './utils';
import { ScriptSpecs } from './ScriptSpecs';
import { ReadonlyRegisterSpecs, InputRegisterSpecs } from './AirObject';
import { Expression, ExpressionDegree } from './visitor';

// INTERFACES
// ================================================================================================
interface VariableInfo {
    dimensions  : Dimensions;
    degree      : ExpressionDegree;
}

// CLASS DEFINITION
// ================================================================================================
export class StatementContext {

    readonly globalConstants        : Map<string, Dimensions>;
    readonly localVariables         : Map<string, VariableInfo>;
    readonly subroutines            : Map<string, string>;
    readonly mutableRegisterCount   : number;
    readonly presetRegisters        : ReadonlyRegisterSpecs[];
    readonly secretRegisters        : InputRegisterSpecs[];
    readonly publicRegisters        : InputRegisterSpecs[];
    readonly canAccessFutureState   : boolean;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(specs: ScriptSpecs, canAccessFutureState: boolean) {
        this.subroutines = new Map();
        this.localVariables = new Map();
        this.globalConstants = specs.globalConstants;
        this.mutableRegisterCount = specs.mutableRegisterCount;
        this.presetRegisters = specs.presetRegisters;
        this.secretRegisters = specs.secretRegisters;
        this.publicRegisters = specs.publicRegisters;
        this.canAccessFutureState = canAccessFutureState;
    }

    // VARIABLES
    // --------------------------------------------------------------------------------------------
    buildVariableAssignment(variable: string, dimensions: Dimensions, degree: ExpressionDegree) {
        if (this.globalConstants.has(variable)) {
            throw new Error(`Value of global constant '${variable}' cannot be changed`);
        }
        
        const variableInfo = this.localVariables.get(variable);
        if (variableInfo) {
            if (!areSameDimension(dimensions, variableInfo.dimensions)) {
                throw new Error(`Dimensions of variable '${variable}' cannot be changed`);
            }

            return {
                code        : `$${variable}`,
                dimensions  : dimensions
            };
        }
        else {
            validateVariableName(variable, dimensions);
            this.localVariables.set(variable, { dimensions, degree });

            return {
                code        : `let $${variable}`,
                dimensions  : dimensions
            };
        }
    }

    buildVariableReference(variable: string): Expression {
        if (this.localVariables.has(variable)) {
            const variableInfo = this.localVariables.get(variable)!;
            return {
                code        : `$${variable}`,
                dimensions  : variableInfo.dimensions,
                degree      : variableInfo.degree
            };
        }
        else if (this.globalConstants.has(variable)) {
            return {
                code        : `g.${variable}`,
                dimensions  : this.globalConstants.get(variable)!,
                degree      : 0n
            };
        }
        else {
            throw new Error(`Variable '${variable}' is not defined`);
        }
    }

    // REGISTERS
    // --------------------------------------------------------------------------------------------
    buildRegisterReference(register: string): Expression {
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

        return { code: `${name}[${index}]`, dimensions: [0, 0], degree: 1n };
    }

    isBinaryRegister(register: string): boolean {
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
    addSubroutine(code: string): string {
        const subName = `sub${this.subroutines.size}`;
        const subParams = this.getSubroutineParameters().join(', ');
        const subFunction = `function ${subName}(${subParams}) {\n${code}}\n`;
        this.subroutines.set(subName, subFunction);
        return subName;
    }

    callSubroutine(subName: string, outParamName: string): string {
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