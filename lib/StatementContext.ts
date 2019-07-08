// IMPORTS
// ================================================================================================
import { Dimensions, validateVariableName } from './utils';
import { ScriptSpecs } from './ScriptSpecs';
import { ReadonlyRegisterSpecs, InputRegisterSpecs } from './AirObject';

// CLASS DEFINITION
// ================================================================================================
export class StatementContext {

    readonly globalConstants        : Map<string, Dimensions>;
    readonly localVariables         : Map<string, Dimensions>;
    readonly mutableRegisterCount   : number;
    readonly presetRegisters        : ReadonlyRegisterSpecs[];
    readonly secretRegisters        : InputRegisterSpecs[];
    readonly publicRegisters        : InputRegisterSpecs[];
    readonly canAccessFutureState   : boolean;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(specs: ScriptSpecs, canAccessFutureState: boolean) {
        this.localVariables = new Map();
        this.globalConstants = specs.globalConstants;
        this.mutableRegisterCount = specs.mutableRegisterCount;
        this.presetRegisters = specs.presetRegisters;
        this.secretRegisters = specs.secretRegisters;
        this.publicRegisters = specs.publicRegisters;
        this.canAccessFutureState = canAccessFutureState;
    }

    // VARIABLE METHODS
    // --------------------------------------------------------------------------------------------
    buildVariableAssignment(variable: string, dimensions: Dimensions) {
        if (this.globalConstants.has(variable)) {
            throw new Error(`Value of global constant '${variable}' cannot be changed`);
        }
        
        const sDimensions = this.localVariables.get(variable);
        if (sDimensions) {
            if (dimensions[0] !== sDimensions[0] || dimensions[1] !== sDimensions[1]) {
                throw new Error(`Dimensions of variable '${variable}' cannot be changed`);
            }

            return {
                code        : `$${variable}`,
                dimensions  : dimensions
            };
        }
        else {
            validateVariableName(variable, dimensions);
            this.localVariables.set(variable, dimensions);

            return {
                code        : `let $${variable}`,
                dimensions  : dimensions
            };
        }
    }

    buildVariableReference(variable: string) {
        if (this.localVariables.has(variable)) {
            return {
                code        : `$${variable}`,
                dimensions  : this.localVariables.get(variable)!
            };
        }
        else if (this.globalConstants.has(variable)) {
            return {
                code        : `g.${variable}`,
                dimensions  : this.globalConstants.get(variable)!
            };
        }
        else {
            throw new Error(`Variable '${variable}' is not defined`);
        }
    }

    // REGISTER METHODS
    // --------------------------------------------------------------------------------------------
    buildRegisterReference(register: string): string {
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

        return `${name}[${index}]`;
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
}