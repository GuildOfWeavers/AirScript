// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from "./Expression";
import { Dimensions } from "../../utils";

// INTERFACES
// ================================================================================================
enum OperationType {
    neg = 1, inv = 2
}

// CLASS DEFINITION
// ================================================================================================
export class UnaryOperation extends Expression {

    readonly operation  : OperationType;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    private constructor(operation: OperationType, operand: Expression, dimensions: Dimensions, degree: ExpressionDegree) {
        super(dimensions, degree, [operand]);
        this.operation = operation;
    }

    static neg(operand: Expression): UnaryOperation {
        
        return new UnaryOperation(OperationType.neg, operand, operand.dimensions, operand.degree);
    }

    static inv(operand: Expression): UnaryOperation {
        const degree = operand.degree; // TODO: incorrect
        return new UnaryOperation(OperationType.inv, operand, operand.dimensions, degree);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get operand(): Expression { return this.children[0]; }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        const op = OperationType[this.operation];
        return `(${op} ${this.operand.toString()})`;
    }
}