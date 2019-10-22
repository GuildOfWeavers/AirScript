"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const utils_1 = require("../../expressions/utils");
const ConstantValue_1 = require("./ConstantValue");
// INTERFACES
// ================================================================================================
var OperationType;
(function (OperationType) {
    OperationType[OperationType["add"] = 1] = "add";
    OperationType[OperationType["sub"] = 2] = "sub";
    OperationType[OperationType["mul"] = 3] = "mul";
    OperationType[OperationType["div"] = 4] = "div";
    OperationType[OperationType["exp"] = 5] = "exp";
    OperationType[OperationType["prod"] = 6] = "prod";
})(OperationType || (OperationType = {}));
// CLASS DEFINITION
// ================================================================================================
class BinaryOperation extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(operation, lhs, rhs, dimensions, degree) {
        super(dimensions, degree, [lhs, rhs]);
        this.operation = operation;
    }
    static add(lhs, rhs) {
        if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot add {${lhs.dimensions}} value to {${rhs.dimensions}} value`);
        }
        const degree = utils_1.maxDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(OperationType.add, lhs, rhs, lhs.dimensions, degree);
    }
    static sub(lhs, rhs) {
        if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot subtract {${rhs.dimensions}} value from {${lhs.dimensions}} value`);
        }
        const degree = utils_1.maxDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(OperationType.sub, lhs, rhs, lhs.dimensions, degree);
    }
    static mul(lhs, rhs) {
        if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot multiply {${lhs.dimensions}} value by {${rhs.dimensions}} value`);
        }
        const degree = utils_1.sumDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(OperationType.mul, lhs, rhs, lhs.dimensions, degree);
    }
    static div(lhs, rhs) {
        if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot divide {${lhs.dimensions}} value by {${rhs.dimensions}} value`);
        }
        const degree = utils_1.sumDegree(lhs.degree, rhs.degree); // TODO: incorrect
        return new BinaryOperation(OperationType.div, lhs, rhs, lhs.dimensions, degree);
    }
    static exp(lhs, rhs) {
        if (!rhs.isScalar) {
            throw new Error(`cannot raise to non-scalar power`);
        }
        else if (rhs instanceof ConstantValue_1.ConstantValue === false) {
            throw new Error(`cannot raise to non-constant power`);
        }
        const rhsValue = rhs.value;
        const degree = utils_1.mulDegree(lhs.degree, rhsValue);
        return new BinaryOperation(OperationType.exp, lhs, rhs, lhs.dimensions, degree);
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
            degree = utils_1.linearCombinationDegree(lhs.degree, rhs.degree);
        }
        else if (lhs.isMatrix && rhs.isVector) {
            if (d1[1] !== d2[0]) {
                throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
            }
            dimensions = [d1[0], 0];
            degree = utils_1.matrixVectorProductDegree(lhs.degree, rhs.degree);
        }
        else if (lhs.isMatrix && rhs.isMatrix) {
            if (d1[1] !== d2[0]) {
                throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
            }
            dimensions = [d1[0], d2[1]];
            degree = utils_1.matrixMatrixProductDegree(lhs.degree, rhs.degree);
        }
        else {
            throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
        }
        return new BinaryOperation(OperationType.prod, lhs, rhs, dimensions, degree);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get lhs() { return this.children[0]; }
    get rhs() { return this.children[1]; }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString() {
        const op = OperationType[this.operation];
        return `(${op} ${this.lhs.toString()} ${this.rhs.toString()})`;
    }
}
exports.BinaryOperation = BinaryOperation;
//# sourceMappingURL=BinaryOperation.js.map