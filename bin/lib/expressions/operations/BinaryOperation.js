"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
const LiteralExpression_1 = require("../LiteralExpression");
const degreeUtils_1 = require("../degreeUtils");
// CLASS DEFINITION
// ================================================================================================
class BinaryOperation extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(operation, lhs, rhs, dimensions, degree) {
        super(dimensions, degree);
        this.operation = operation;
        this.lhs = lhs;
        this.rhs = rhs;
    }
    static add(lhs, rhs) {
        if (rhs.isList || lhs.isList) {
            throw new Error('cannot add destructured lists');
        }
        else if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot add {${lhs.dimensions}} value to {${rhs.dimensions}} value`);
        }
        const degree = degreeUtils_1.maxDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(1 /* add */, lhs, rhs, lhs.dimensions, degree);
    }
    static sub(lhs, rhs) {
        if (rhs.isList || lhs.isList) {
            throw new Error('cannot subtract destructured lists');
        }
        else if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot subtract {${rhs.dimensions}} value from {${lhs.dimensions}} value`);
        }
        const degree = degreeUtils_1.maxDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(2 /* sub */, lhs, rhs, lhs.dimensions, degree);
    }
    static mul(lhs, rhs) {
        if (rhs.isList || lhs.isList) {
            throw new Error('cannot multiply destructured lists');
        }
        else if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot multiply {${lhs.dimensions}} value by {${rhs.dimensions}} value`);
        }
        const degree = degreeUtils_1.sumDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(3 /* mul */, lhs, rhs, lhs.dimensions, degree);
    }
    static div(lhs, rhs) {
        if (rhs.isList || lhs.isList) {
            throw new Error('cannot divide destructured lists');
        }
        else if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot divide {${lhs.dimensions}} value by {${rhs.dimensions}} value`);
        }
        const degree = degreeUtils_1.sumDegree(lhs.degree, rhs.degree); // TODO: incorrect
        return new BinaryOperation(4 /* div */, lhs, rhs, lhs.dimensions, degree);
    }
    static exp(lhs, rhs) {
        if (lhs.isList || rhs.isList) {
            throw new Error('cannot exponentiate destructured list');
        }
        else if (!rhs.isScalar) {
            throw new Error(`cannot raise to non-scalar power`);
        }
        else if (rhs instanceof LiteralExpression_1.LiteralExpression === false) {
            throw new Error(`cannot raise to non-static power`);
        }
        const rhsValue = rhs.value;
        const degree = degreeUtils_1.mulDegree(lhs.degree, rhsValue);
        return new BinaryOperation(5 /* exp */, lhs, rhs, lhs.dimensions, degree);
    }
    static prod(lhs, rhs) {
        const d1 = lhs.dimensions;
        const d2 = rhs.dimensions;
        let dimensions, degree;
        if (lhs.isVector && rhs.isVector) {
            if (d1[0] !== d2[0]) {
                throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
            }
            dimensions = [0, 0];
            degree = degreeUtils_1.linearCombinationDegree(lhs.degree, rhs.degree);
        }
        else if (lhs.isMatrix && rhs.isVector) {
            if (d1[1] !== d2[0]) {
                throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
            }
            dimensions = [d1[0], 0];
            degree = degreeUtils_1.matrixVectorProductDegree(lhs.degree, rhs.degree);
        }
        else if (lhs.isMatrix && rhs.isMatrix) {
            if (d1[1] !== d2[0]) {
                throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
            }
            dimensions = [d1[0], d2[1]];
            degree = degreeUtils_1.matrixMatrixProductDegree(lhs.degree, rhs.degree);
        }
        else if (lhs.isList || rhs.isList) {
            throw new Error('cannot compute a product of destructured lists');
        }
        else {
            throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
        }
        return new BinaryOperation(6 /* prod */, lhs, rhs, dimensions, degree);
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode() {
        const opFunction = getOpFunction(this.operation, this.lhs, this.rhs);
        return `f.${opFunction}(${this.lhs.toCode()}, ${this.rhs.toCode()})`;
    }
}
exports.BinaryOperation = BinaryOperation;
// HELPER FUNCTIONS
// ================================================================================================
function getOpFunction(op, e1, e2) {
    switch (op) {
        case 1 /* add */: {
            if (e1.isScalar)
                return `add`;
            else if (e1.isVector)
                return 'addVectorElements';
            else
                return 'addMatrixElements';
        }
        case 2 /* sub */: {
            if (e1.isScalar)
                return `sub`;
            else if (e1.isVector)
                return 'subVectorElements';
            else
                return 'subMatrixElements';
        }
        case 3 /* mul */: {
            if (e1.isScalar)
                return `mul`;
            else if (e1.isVector)
                return 'mulVectorElements';
            else
                return 'mulMatrixElements';
        }
        case 4 /* div */: {
            if (e1.isScalar)
                return `div`;
            else if (e1.isVector)
                return 'divVectorElements';
            else
                return 'divMatrixElements';
        }
        case 5 /* exp */: {
            if (e1.isScalar)
                return `exp`;
            else if (e1.isVector)
                return 'expVectorElements';
            else
                return 'expMatrixElements';
        }
        case 6 /* prod */: {
            if (e1.isVector && e2.isVector)
                return `combineVectors`;
            else if (e1.isMatrix && e2.isVector)
                return 'mulMatrixByVector';
            else
                return 'mulMatrixes';
        }
    }
}
//# sourceMappingURL=BinaryOperation.js.map