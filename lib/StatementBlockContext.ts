// IMPORTS
// ================================================================================================
import { Dimensions, isScalar, isVector } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class StatementBlockContext {

    readonly globals            : Map<string, Dimensions>;
    readonly variables          : Map<string, Dimensions>;
    readonly registerCount      : number;
    readonly constantCount      : number;
    readonly canAccessFuture    : boolean;

    constructor(globals: Map<string, Dimensions>, registerCount: number, constantCount: number, canAccessFuture: boolean) {
        this.globals = globals;
        this.variables = new Map();
        this.registerCount = registerCount;
        this.constantCount = constantCount;
        this.canAccessFuture = canAccessFuture;
    }

    buildVariableAssignment(variable: string, dimensions: Dimensions) {
        if (this.globals.has(variable)) {
            throw new Error(`Value of global constant '${variable}' cannot be changed`);
        }
        
        const sDimensions = this.variables.get(variable);
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
            this.variables.set(variable, dimensions);

            return {
                code        : `let $${variable}`,
                dimensions  : dimensions
            };
        }
    }

    buildVariableReference(variable: string) {
        if (this.variables.has(variable)) {
            return {
                code        : `$${variable}`,
                dimensions  : this.variables.get(variable)!
            };
        }
        else if (this.globals.has(variable)) {
            return {
                code        : `g.${variable}`,
                dimensions  : this.globals.get(variable)!
            };
        }
        else {
            throw new Error(`Variable '${variable}' is not defined`);
        }
    }

    buildRegisterReference(register: string): string {
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

// HELPER FUNCTIONS
// ================================================================================================
export function validateVariableName(variable: string, dimensions: Dimensions) {

    const errorMessage = `Variable name '${variable}' is invalid`; 

    if (isScalar(dimensions)) {
        if (variable != variable.toLowerCase()) {
            throw new Error(`${errorMessage}: scalar variable names cannot contain uppercase characters`);
        }
    }
    else if (isVector(dimensions)) {
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