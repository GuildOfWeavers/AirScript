// IMPORTS
// ================================================================================================
import { Expression } from './Expression';
import { LoadSource, getLoadSource } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class LoadExpression extends Expression {

    readonly source : LoadSource;
    readonly index  : number;
    readonly value  : Expression;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(operation: string, index: number, value: Expression) {
        super(value.dimensions, value.degree);
        this.source = getLoadSource(operation);
        this.index = index;
        this.value = value;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        return `(load.${this.source} ${this.index})`;
    }
}