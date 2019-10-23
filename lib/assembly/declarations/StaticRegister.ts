// IMPORTS
// ================================================================================================
import { FiniteField } from "@guildofweavers/galois";

// CLASS DEFINITION
// ================================================================================================
export class StaticRegister {

    readonly pattern        : 'repeat' | 'spread';
    readonly binary         : boolean;
    readonly values         : bigint[];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(pattern: string, binary: boolean, values: bigint[], field: FiniteField) {
        if (pattern === 'repeat' || pattern == 'spread') {
            this.pattern = pattern;
        }
        else {
            throw new Error(`static register pattern '${pattern}' is invalid`);
        }
        this.binary = binary;
        this.values = values;

        if (binary) {
            for (let value of values) {
                if (value !== field.one && value !== field.zero) {
                    throw new Error(`binary register cannot contain non-binary value '${value}'`);
                }
            }
        }
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        const binary = this.binary ? ' binary' : '';
        return `(static ${this.pattern}${binary} ${this.values.join(' ')})`;
    }
}