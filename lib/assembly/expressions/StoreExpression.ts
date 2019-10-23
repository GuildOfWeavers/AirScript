// IMPORTS
// ================================================================================================
import { Expression } from './Expression';
import { StoreTarget, getStoreTarget } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class StoreExpression extends Expression {

    readonly target : StoreTarget;
    readonly index  : number;
    readonly value  : Expression;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(operation: string, index: number, value: Expression) {
        super(value.dimensions, value.degree);
        this.target = getStoreTarget(operation);
        this.index = index;
        this.value = value;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        return `(store.${this.target} ${this.index} ${this.value.toString()})`;
    }
}