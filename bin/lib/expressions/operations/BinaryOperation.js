"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
const LiteralExpression_1 = require("../LiteralExpression");
const utils_1 = require("../utils");
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
        const degree = utils_1.maxDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(OperationType.add, lhs, rhs, lhs.dimensions, degree);
    }
    static sub(lhs, rhs) {
        if (rhs.isList || lhs.isList) {
            throw new Error('cannot subtract destructured lists');
        }
        else if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot subtract {${rhs.dimensions}} value from {${lhs.dimensions}} value`);
        }
        const degree = utils_1.maxDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(OperationType.sub, lhs, rhs, lhs.dimensions, degree);
    }
    static mul(lhs, rhs) {
        if (rhs.isList || lhs.isList) {
            throw new Error('cannot multiply destructured lists');
        }
        else if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot multiply {${lhs.dimensions}} value by {${rhs.dimensions}} value`);
        }
        const degree = utils_1.sumDegree(lhs.degree, rhs.degree);
        return new BinaryOperation(OperationType.mul, lhs, rhs, lhs.dimensions, degree);
    }
    static div(lhs, rhs) {
        if (rhs.isList || lhs.isList) {
            throw new Error('cannot divide destructured lists');
        }
        else if (!rhs.isScalar && !lhs.isSameDimensions(rhs)) {
            throw new Error(`cannot divide {${lhs.dimensions}} value by {${rhs.dimensions}} value`);
        }
        const degree = utils_1.sumDegree(lhs.degree, rhs.degree); // TODO: incorrect
        return new BinaryOperation(OperationType.div, lhs, rhs, lhs.dimensions, degree);
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
    toJsCode(assignTo, options = {}) {
        const opFunction = getOpFunction(this.operation, this.lhs, this.rhs);
        let code = `f.${opFunction}(${this.lhs.toJsCode()}, ${this.rhs.toJsCode()})`;
        if (this.isVector && options.vectorAsArray) {
            code = `${code}.toValues()`;
        }
        if (assignTo) {
            code = `${assignTo} = ${code};\n`;
        }
        return code;
    }
    toAssembly() {
        const op = OperationType[this.operation];
        return `(${op} ${this.lhs.toAssembly()} ${this.rhs.toAssembly()})`;
    }
}
exports.BinaryOperation = BinaryOperation;
// HELPER FUNCTIONS
// ================================================================================================
function getOpFunction(op, e1, e2) {
    switch (op) {
        case OperationType.add: {
            if (e1.isScalar)
                return `add`;
            else if (e1.isVector)
                return 'addVectorElements';
            else
                return 'addMatrixElements';
        }
        case OperationType.sub: {
            if (e1.isScalar)
                return `sub`;
            else if (e1.isVector)
                return 'subVectorElements';
            else
                return 'subMatrixElements';
        }
        case OperationType.mul: {
            if (e1.isScalar)
                return `mul`;
            else if (e1.isVector)
                return 'mulVectorElements';
            else
                return 'mulMatrixElements';
        }
        case OperationType.div: {
            if (e1.isScalar)
                return `div`;
            else if (e1.isVector)
                return 'divVectorElements';
            else
                return 'divMatrixElements';
        }
        case OperationType.exp: {
            if (e1.isScalar)
                return `exp`;
            else if (e1.isVector)
                return 'expVectorElements';
            else
                return 'expMatrixElements';
        }
        case OperationType.prod: {
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