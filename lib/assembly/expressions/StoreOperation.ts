// IMPORTS
// ================================================================================================
import { Expression } from './Expression';

// INTERFACES
// ================================================================================================
type Target = 'local';

const targets: { [index: string]: Target } = {
    'save.local': 'local'
};

// CLASS DEFINITION
// ================================================================================================
export class StoreOperation extends Expression {

    readonly target : Target;
    readonly index  : number;
    readonly value  : Expression;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(operation: string, index: number, value: Expression) {
        super(value.dimensions, value.degree);
        this.target = targets[operation];
        this.index = index;
        this.value = value;

        if (!this.target) {
            throw new Error(`${operation} is not a valid store operation`);
        }
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        return `(store.${this.target} ${this.index} ${this.value.toString()})`;
    }
}