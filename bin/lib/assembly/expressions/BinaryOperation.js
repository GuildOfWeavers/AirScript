"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const utils_1 = require("../../utils");
const utils_2 = require("../../expressions/utils");
const ConstantValue_1 = require("./ConstantValue");
// CLASS DEFINITION
// ================================================================================================
class BinaryOperation extends Expression_1.Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(operation, lhs, rhs) {
        let degree;
        if (operation === 'add' || operation === 'sub') {
            checkDimensions(lhs, rhs, operation);
            degree = utils_2.maxDegree(lhs.degree, rhs.degree);
        }
        else if (operation === 'mul') {
            checkDimensions(lhs, rhs, operation);
            degree = utils_2.sumDegree(lhs.degree, rhs.degree);
        }
        else if (operation === 'div') {
            checkDimensions(lhs, rhs, operation);
            degree = utils_2.sumDegree(lhs.degree, rhs.degree); // TODO: incorrect
        }
        else if (operation === 'exp') {
            if (!rhs.isScalar)
                throw new Error(`cannot raise to non-scalar power`);
            else if (rhs instanceof ConstantValue_1.ConstantValue === false)
                throw new Error(`cannot raise to non-constant power`);
            const rhsValue = rhs.value;
            degree = utils_2.mulDegree(lhs.degree, rhsValue);
        }
        else if (operation === 'prod') {
            degree = getProductDegree(lhs, rhs);
        }
        else {
            throw new Error(`binary operation '${operation}' is not valid`);
        }
        super(utils_1.degreeToDimensions(degree), degree, [lhs, rhs]);
        this.operation = operation;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get lhs() { return this.children[0]; }
    get rhs() { return this.children[1]; }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString() {
        return `(${this.operation} ${this.lhs.toString()} ${this.rhs.toString()})`;
    }
}
exports.BinaryOperation = BinaryOperation;
// HELPER FUNCTIONS
// ================================================================================================
function checkDimensions(lhs, rhs, operation) {
    if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
        const d1 = `${lhs.dimensions[0]}x${lhs.dimensions[1]}`;
        const d2 = `${rhs.dimensions[0]}x${rhs.dimensions[1]}`;
        if (operation === 'add')
            throw new Error(`cannot add {${d1}} value to {${d2}} value`);
        else if (operation === 'sub')
            throw new Error(`cannot subtract {${d2}} value from {${d1}} value`);
        else if (operation === 'mul')
            throw new Error(`cannot multiply {${d1}} value by {${d2}} value`);
        else if (operation === 'div')
            throw new Error(`cannot divide {${d1}} value by {${d2}} value`);
    }
}
function getProductDegree(rhs, lhs) {
    const d1 = lhs.dimensions;
    const d2 = rhs.dimensions;
    if (lhs.isVector && rhs.isVector) {
        if (d1[0] !== d2[0])
            throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
        return utils_2.linearCombinationDegree(lhs.degree, rhs.degree);
    }
    else if (lhs.isMatrix && rhs.isVector) {
        if (d1[1] !== d2[0])
            throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
        return utils_2.matrixVectorProductDegree(lhs.degree, rhs.degree);
    }
    else if (lhs.isMatrix && rhs.isMatrix) {
        if (d1[1] !== d2[0])
            throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
        return utils_2.matrixMatrixProductDegree(lhs.degree, rhs.degree);
    }
    else {
        throw new Error(`cannot compute a product of {${d1}} and {${d2}} values`);
    }
}
//# sourceMappingURL=BinaryOperation.js.map