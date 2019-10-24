// IMPORTS
// ================================================================================================
import { Expression } from "./Expression";

// INTERFACES
// ================================================================================================
type OperationType = 'neg' | 'inv';

// CLASS DEFINITION
// ================================================================================================
export class UnaryOperation extends Expression {

    readonly operation  : OperationType;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(operation: string, operand: Expression) {
        if (operation === 'neg') {
            super(operand.dimensions, operand.degree, [operand]);
        }
        else if (operation === 'inv') {
            const degree = operand.degree; // TODO: incorrect
            super(operand.dimensions, degree, [operand]);
        }
        else {
            throw new Error(`unary operation '${operation}' is not valid`);
        }
        this.operation = operation;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get operand(): Expression { return this.children[0]; }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        return `(${this.operation} ${this.operand.toString()})`;
    }
}