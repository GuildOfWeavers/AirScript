// IMPORTS
// ================================================================================================
import { FiniteField, createPrimeField, WasmOptions } from "@guildofweavers/galois";

// CLASS DEFINITION
// ================================================================================================
export class FieldDeclaration {

    readonly type       : 'prime';
    readonly modulus    : bigint;
    readonly field      : FiniteField;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(type: string, modulus: bigint, wasmOptions?: WasmOptions) {
        if (type === 'prime') {
            this.type = type;
            this.field = createPrimeField(modulus, wasmOptions);
        }
        else {
            throw new Error(`field type '${type}' is not supported`);
        }
        this.modulus = modulus;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        return `(field ${this.type} ${this.modulus})`;
    }
}