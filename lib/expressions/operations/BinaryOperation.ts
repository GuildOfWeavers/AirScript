// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from "../Expression";
import { LiteralExpression } from "../LiteralExpression";
import { Dimensions } from "../../utils";
import {
    maxDegree, sumDegree, mulDegree, linearCombinationDegree, matrixVectorProductDegree, matrixMatrixProductDegree
} from '../degreeUtils';

// INTERFACES
// ================================================================================================
const enum OperationType {
    add = 1, sub = 2, mul = 3, div = 4, exp = 5, prod = 6
}

// CLASS DEFINITION
// ================================================================================================
export class BinaryOperation extends Expression {

    readonly operation  : OperationType;
    readonly lhs        : Expression;
    readonly rhs        : Expression;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    private constructor(operation: OperationType, lhs: Expression, rhs: Expression, dimensions: Dimensions, degree: ExpressionDegree) {
        super(dimensions, degree);
        this.operation = operation;
        this.lhs = lhs;
        this.rhs = rhs;
    }

    static add(lhs: Expression, rhs: Expression): BinaryOperation {
        if (rhs.isList || lhs.isList) {
            throw new Error('cannot add destructured lists');
        }
        else if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot add {${lhs.dimensions}} value to {${rhs.dimensions}} value`);
        }

        const degree = maxDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(OperationType.add, lhs, rhs, lhs.dimensions, degree);
    }

    static sub(lhs: Expression, rhs: Expression): BinaryOperation {
        if (rhs.isList || lhs.isList) {
            throw new Error('cannot subtract destructured lists');
        }
        else if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot subtract {${rhs.dimensions}} value from {${lhs.dimensions}} value`);
        }

        const degree = maxDegree(lhs.degree, rhs.degree, );
        return new BinaryOperation(OperationType.sub, lhs, rhs, lhs.dimensions, degree);
    }

    static mul(lhs: Expression, rhs: Expression): BinaryOperation {
        if (rhs.isList || lhs.isList) {
            throw new Error('cannot multiply destructured lists');
        }
        else if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot multiply {${lhs.dimensions}} value by {${rhs.dimensions}} value`);
        }

        const degree = sumDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(OperationType.mul, lhs, rhs, lhs.dimensions, degree);
    }

    static div(lhs: Expression, rhs: Expression): BinaryOperation {
        if (rhs.isList || lhs.isList) {
            throw new Error('cannot divide destructured lists');
        }
        else if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot divide {${lhs.dimensions}} value by {${rhs.dimensions}} value`);
        }

        const degree = sumDegree(lhs.degree, rhs.degree);  // TODO: incorrect
        return new BinaryOperation(OperationType.div, lhs, rhs, lhs.dimensions, degree);
    }

    static exp(lhs: Expression, rhs: Expression): BinaryOperation {
        if (lhs.isList || rhs.isList) {
            throw new Error('cannot exponentiate destructured list');
        }
        else if (!rhs.isScalar) {
            throw new Error(`cannot raise to non-scalar power`);
        }
        else if (rhs instanceof LiteralExpression === false) {
            throw new Error(`cannot raise to non-static power`);
        }

        const rhsValue = (rhs as LiteralExpression).value as bigint;
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
        else if (lhs.isList || rhs.isList) {
            throw new Error('cannot compute a product of destructured lists');
        }
        else {
            throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
        }

        return new BinaryOperation(OperationType.prod, lhs, rhs, dimensions, degree);
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode(): string {
        const opFunction = getOpFunction(this.operation, this.lhs, this.rhs);
        return `f.${opFunction}(${this.lhs.toCode()}, ${this.rhs.toCode()})`;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function getOpFunction(op: OperationType, e1: Expression, e2: Expression): string {
    switch (op) {
        case OperationType.add: {
            if (e1.isScalar)                        return `add`;
            else if (e1.isVector)                   return 'addVectorElements';
            else                                    return 'addMatrixElements';
        }
        case OperationType.sub: {
            if (e1.isScalar)                        return `sub`;
            else if (e1.isVector)                   return 'subVectorElements';
            else                                    return 'subMatrixElements';
        }
        case OperationType.mul: {
            if (e1.isScalar)                        return `mul`;
            else if (e1.isVector)                   return 'mulVectorElements';
            else                                    return 'mulMatrixElements';
        }
        case OperationType.div: {
            if (e1.isScalar)                        return `div`;
            else if (e1.isVector)                   return 'divVectorElements';
            else                                    return 'divMatrixElements';
        }
        case OperationType.exp: {
            if (e1.isScalar)                        return `exp`;
            else if (e1.isVector)                   return 'expVectorElements';
            else                                    return 'expMatrixElements';
        }
        case OperationType.prod: {
            if (e1.isVector && e2.isVector)         return `combineVectors`;
            else if (e1.isMatrix && e2.isVector)    return 'mulMatrixByVector';
            else                                    return 'mulMatrixes';
        }
    }
}