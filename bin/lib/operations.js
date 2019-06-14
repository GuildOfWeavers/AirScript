"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const chevrotain_1 = require("chevrotain");
const lexer_1 = require("./lexer");
// PUBLIC FUNCTIONS
// ================================================================================================
function getOperationHandler(token) {
    if (chevrotain_1.tokenMatcher(token, lexer_1.Plus))
        return addition;
    else if (chevrotain_1.tokenMatcher(token, lexer_1.Minus))
        return subtraction;
    else if (chevrotain_1.tokenMatcher(token, lexer_1.Star))
        return multiplication;
    else if (chevrotain_1.tokenMatcher(token, lexer_1.Slash))
        return division;
    else if (chevrotain_1.tokenMatcher(token, lexer_1.ExpOp))
        return exponentiation;
    else if (chevrotain_1.tokenMatcher(token, lexer_1.Pound))
        return product;
    else
        throw new Error(`Invalid operator`);
}
exports.getOperationHandler = getOperationHandler;
// ADDITION
// ================================================================================================
const addition = {
    name: 'add',
    getDimensions(d1, d2) {
        if (utils_1.isScalar(d2))
            return d1;
        else if (d1[0] === d2[0] && d1[1] === d2[1])
            return d1;
        else
            throw new Error(`Cannot add ${d1[0]}x${d1[1]} value to ${d2[0]}x${d2[1]} value`);
    },
    getCode(e1, e2) {
        const d1 = e1.dimensions;
        if (utils_1.isScalar(d1))
            return `$field.add(${e1.code}, ${e2.code})`;
        else if (utils_1.isVector(d1))
            return `$field.addVectorElements(${e1.code}, ${e2.code})`;
        else
            return `$field.addMatrixElements(${e1.code}, ${e2.code})`;
    }
};
// SUBTRACTION
// ================================================================================================
const subtraction = {
    name: 'sub',
    getDimensions(d1, d2) {
        if (utils_1.isScalar(d2))
            return d1;
        else if (d1[0] === d2[0] && d1[1] === d2[1])
            return d1;
        else
            throw new Error(`Cannot subtract ${d1[0]}x${d1[1]} value from ${d2[0]}x${d2[1]} value`);
    },
    getCode(e1, e2) {
        const d1 = e1.dimensions;
        if (utils_1.isScalar(d1))
            return `$field.sub(${e1.code}, ${e2.code})`;
        else if (utils_1.isVector(d1))
            return `$field.subVectorElements(${e1.code}, ${e2.code})`;
        else
            return `$field.subMatrixElements(${e1.code}, ${e2.code})`;
    }
};
// MULTIPLICATION
// ================================================================================================
const multiplication = {
    name: 'mul',
    getDimensions(d1, d2) {
        if (utils_1.isScalar(d2))
            return d1;
        else if (d1[0] === d2[0] && d1[1] === d2[1])
            return d1;
        else
            throw new Error(`Cannot multiply ${d1[0]}x${d1[1]} value by ${d2[0]}x${d2[1]} value`);
    },
    getCode(e1, e2) {
        const d1 = e1.dimensions;
        if (utils_1.isScalar(d1))
            return `$field.mul(${e1.code}, ${e2.code})`;
        else if (utils_1.isVector(d1))
            return `$field.mulVectorElements(${e1.code}, ${e2.code})`;
        else
            return `$field.mulMatrixElements(${e1.code}, ${e2.code})`;
    }
};
// DIVISION
// ================================================================================================
const division = {
    name: 'div',
    getDimensions(d1, d2) {
        if (utils_1.isScalar(d2))
            return d1;
        else if (d1[0] === d2[0] && d1[1] === d2[1])
            return d1;
        else
            throw new Error(`Cannot divide ${d1[0]}x${d1[1]} value by ${d2[0]}x${d2[1]} value`);
    },
    getCode(e1, e2) {
        const d1 = e1.dimensions;
        if (utils_1.isScalar(d1))
            return `$field.div(${e1.code}, ${e2.code})`;
        else if (utils_1.isVector(d1))
            return `$field.divVectorElements(${e1.code}, ${e2.code})`;
        else
            return `$field.divMatrixElements(${e1.code}, ${e2.code})`;
    }
};
// EXPONENTIATION
// ================================================================================================
const exponentiation = {
    name: 'exp',
    getDimensions(d1, d2) {
        if (utils_1.isScalar(d2))
            return d1;
        else
            throw new Error(`Cannot raise to non-scalar power`);
    },
    getCode(e1, e2) {
        const d1 = e1.dimensions;
        if (utils_1.isScalar(d1))
            return `$field.exp(${e1.code}, ${e2.code})`;
        else if (utils_1.isVector(d1))
            return `$field.expVectorElements(${e1.code}, ${e2.code})`;
        else
            return `$field.expMatrixElements(${e1.code}, ${e2.code})`;
    }
};
// MATRIX AND VECTOR PRODUCT
// ================================================================================================
const product = {
    name: 'prod',
    getDimensions(d1, d2) {
        if (utils_1.isVector(d1) && utils_1.isVector(d2) && d1[0] === d2[0])
            return [0, 0];
        else if (utils_1.isMatrix(d1) && d1[1] === d2[0])
            return [d1[0], d2[1]];
        else
            throw new Error(`Cannot compute a product of ${d1[0]}x${d1[1]} and ${d2[0]}x${d2[1]} values`);
    },
    getCode(e1, e2) {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;
        if (utils_1.isVector(d1) && utils_1.isVector(d2))
            return `$field.combineVectors(${e1.code}, ${e2.code})`;
        else if (utils_1.isMatrix(d1) && utils_1.isVector(d2))
            return `$field.mulMatrixByVector(${e1.code}, ${e2.code})`;
        else
            return `$field.mulMatrixes(${e1.code}, ${e2.code})`;
    }
};
//# sourceMappingURL=operations.js.map