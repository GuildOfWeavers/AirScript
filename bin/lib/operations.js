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
        throw new Error(`Invalid operator '${token.image}'`);
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
            return `this.add(${e1.code}, ${e2.code})`;
        else if (utils_1.isVector(d1))
            return `this.addVectorElements(${e1.code}, ${e2.code})`;
        else
            return `this.addMatrixElements(${e1.code}, ${e2.code})`;
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
            return `this.sub(${e1.code}, ${e2.code})`;
        else if (utils_1.isVector(d1))
            return `this.subVectorElements(${e1.code}, ${e2.code})`;
        else
            return `this.subMatrixElements(${e1.code}, ${e2.code})`;
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
            return `this.mul(${e1.code}, ${e2.code})`;
        else if (utils_1.isVector(d1))
            return `this.mulVectorElements(${e1.code}, ${e2.code})`;
        else
            return `this.mulMatrixElements(${e1.code}, ${e2.code})`;
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
            return `this.div(${e1.code}, ${e2.code})`;
        else if (utils_1.isVector(d1))
            return `this.divVectorElements(${e1.code}, ${e2.code})`;
        else
            return `this.divMatrixElements(${e1.code}, ${e2.code})`;
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
            return `this.exp(${e1.code}, ${e2.code})`;
        else if (utils_1.isVector(d1))
            return `this.expVectorElements(${e1.code}, ${e2.code})`;
        else
            return `this.expMatrixElements(${e1.code}, ${e2.code})`;
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
            return `this.combineVectors(${e1.code}, ${e2.code})`;
        else if (utils_1.isMatrix(d1) && utils_1.isVector(d2))
            return `this.mulMatrixByVector(${e1.code}, ${e2.code})`;
        else
            return `this.mulMatrixes(${e1.code}, ${e2.code})`;
    }
};
//# sourceMappingURL=operations.js.map