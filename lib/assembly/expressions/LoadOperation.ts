// IMPORTS
// ================================================================================================
import { Expression } from './Expression';

// INTERFACES
// ================================================================================================
type Source = 'const' | 'trace' | 'fixed' | 'local';

const sources: { [index: string]: Source } = {
    'load.const': 'const',
    'load.trace': 'trace',
    'load.fixed': 'fixed',
    'load.local': 'local'
};

// CLASS DEFINITION
// ================================================================================================
export class LoadOperation extends Expression {

    readonly source : Source;
    readonly index  : number;
    readonly value  : Expression;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(operation: string, index: number, value: Expression) {
        super(value.dimensions, value.degree);
        this.source = sources[operation];
        this.index = index;
        this.value = value;

        if (!this.source) {
            throw new Error(`${operation} is not a valid load operation`);
        }
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        return `(load.${this.source} ${this.index})`;
    }
}