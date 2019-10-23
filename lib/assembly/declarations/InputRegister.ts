// IMPORTS
// ================================================================================================
import { FiniteField } from "@guildofweavers/galois";

// CLASS DEFINITION
// ================================================================================================
export class InputRegister {

    readonly binary         : boolean;
    readonly secret         : boolean;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(secret: boolean, binary: boolean) {
        this.secret = secret;
        this.binary = binary;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString(): string {        
        const scope = this.secret ? 'secret' : 'public';
        const binary = this.binary ? ' binary' : '';
        return `(input ${scope}${binary})`;
    }
}