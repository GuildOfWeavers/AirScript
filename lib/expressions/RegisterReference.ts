// IMPORTS
// ================================================================================================
import { Expression } from './Expression';

// CLASS DEFINITION
// ================================================================================================
export class RegisterReference extends Expression {

    readonly regRef: string;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(regRef: string) {
        super([0, 0], 1n);
        this.regRef = regRef;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode(): string {
        return `${this.regRef}`;
    }
}