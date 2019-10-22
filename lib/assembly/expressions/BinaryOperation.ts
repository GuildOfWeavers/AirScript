// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from "./Expression";
import { Dimensions } from "../../utils";
import {
    maxDegree, sumDegree, mulDegree, linearCombinationDegree, matrixVectorProductDegree, matrixMatrixProductDegree
} from '../../expressions/utils';
import { ConstantValue } from "./ConstantValue";

// INTERFACES
// ================================================================================================
enum OperationType {
    add = 1, sub = 2, mul = 3, div = 4, exp = 5, prod = 6
}

// CLASS DEFINITION
// ================================================================================================
export class BinaryOperation extends Expression {

    readonly operation  : OperationType;
    
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    private constructor(operation: OperationType, lhs: Expression, rhs: Expression, dimensions: Dimensions, degree: ExpressionDegree) {
        super(dimensions, degree, [lhs, rhs]);
        this.operation = operation;
    }

    static add(lhs: Expression, rhs: Expression): BinaryOperation {
        if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot add {${lhs.dimensions}} value to {${rhs.dimensions}} value`);
        }

        const degree = maxDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(OperationType.add, lhs, rhs, lhs.dimensions, degree);
    }

    static sub(lhs: Expression, rhs: Expression): BinaryOperation {
        if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot subtract {${rhs.dimensions}} value from {${lhs.dimensions}} value`);
        }

        const degree = maxDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(OperationType.sub, lhs, rhs, lhs.dimensions, degree);
    }

    static mul(lhs: Expression, rhs: Expression): BinaryOperation {
        if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot multiply {${lhs.dimensions}} value by {${rhs.dimensions}} value`);
        }

        const degree = sumDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(OperationType.mul, lhs, rhs, lhs.dimensions, degree);
    }

    static div(lhs: Expression, rhs: Expression): BinaryOperation {
        if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot divide {${lhs.dimensions}} value by {${rhs.dimensions}} value`);
        }

        const degree = sumDegree(lhs.degree, rhs.degree);  // TODO: incorrect
        return new BinaryOperation(OperationType.div, lhs, rhs, lhs.dimensions, degree);
    }

    static exp(lhs: Expression, rhs: Expression): BinaryOperation {
        if (!rhs.isScalar) {
            throw new Error(`cannot raise to non-scalar power`);
        }
        else if (rhs instanceof ConstantValue === false) {
            throw new Error(`cannot raise to non-constant power`);
        }

        const rhsValue = (rhs as ConstantValue).value as bigint;
        const degree = mulDegree(lhs.degree, rhsValue);
        return new BinaryOperation(OperationType.exp, lhs, rhs, lhs.dimensions, degree);
    }

    static prod(lhs: Expression, rhs: Expression): BinaryOperation {
        const d1 = lhs.dimensions;
        const d2 = rhs.dimensions;

        let dimensions: Dimensions, degree: ExpressionDegree;
        if (lhs.isVector && rhs.isVector) {
            if (d1[0] !== d2[0]) {
                throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
            }
            dimensions = [0, 0];
            degree = linearCombinationDegree(lhs.degree as bigint[], rhs.degree as bigint[]);
        }
        else if (lhs.isMatrix && rhs.isVector) {
            if (d1[1] !== d2[0]) {
                throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
            }
            dimensions = [d1[0], 0];
            degree = matrixVectorProductDegree(lhs.degree as bigint[][], rhs.degree as bigint[]);
        }
        else if (lhs.isMatrix && rhs.isMatrix) {
            if (d1[1] !== d2[0]) {
                throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
            }
            dimensions = [d1[0], d2[1]];
            degree = matrixMatrixProductDegree(lhs.degree as bigint[][], rhs.degree as bigint[][]);
        }
        else {
            throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
        }

        return new BinaryOperation(OperationType.prod, lhs, rhs, dimensions, degree);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get lhs(): Expression { return this.children[0]; }
    get rhs(): Expression { return this.children[1]; }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        const op = OperationType[this.operation];
        return `(${op} ${this.lhs.toString()} ${this.rhs.toString()})`;
    }
}