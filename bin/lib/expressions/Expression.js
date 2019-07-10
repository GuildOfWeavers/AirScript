"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StaticExpression_1 = require("./StaticExpression");
// CLASS DEFINITION
// ================================================================================================
class Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(code, dimensions, degree, destructured = false) {
        this.code = code;
        this.dimensions = dimensions;
        this.degree = degree;
        this.destructured = destructured;
    }
    // DIMENSION METHODS AND ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isScalar() {
        return (this.dimensions[0] === 0 && this.dimensions[1] === 0);
    }
    get isVector() {
        return (this.dimensions[0] > 0 && this.dimensions[1] === 0);
    }
    get isMatrix() {
        return (this.dimensions[1] > 0);
    }
    isSameDimensions(e) {
        return this.dimensions[0] === e.dimensions[0]
            && this.dimensions[1] === e.dimensions[1];
    }
    // ARITHMETIC OPERATIONS
    // --------------------------------------------------------------------------------------------
    add(e) {
        if (!e.isScalar && !this.isSameDimensions(e)) {
            const vd1 = `${this.dimensions[0]}x${this.dimensions[1]}`;
            const vd2 = `${e.dimensions[0]}x${e.dimensions[1]}`;
            throw new Error(`Cannot add ${vd2} value to ${vd1} value`);
        }
        let code = '', degree;
        if (this.isScalar) {
            code = `f.add(${this.code}, ${e.code})`;
            degree = maxDegree(this.degree, e.degree);
        }
        else if (this.isVector) {
            code = `f.addVectorElements(${this.code}, ${e.code})`;
            degree = vectorDegree(maxDegree, this.degree, e.degree);
        }
        else {
            code = `f.addMatrixElements(${this.code}, ${e.code})`;
            degree = matrixDegree(maxDegree, this.degree, e.degree);
        }
        return new Expression(code, this.dimensions, degree);
    }
    sub(e) {
        if (!e.isScalar && !this.isSameDimensions(e)) {
            const vd1 = `${this.dimensions[0]}x${this.dimensions[1]}`;
            const vd2 = `${e.dimensions[0]}x${e.dimensions[1]}`;
            throw new Error(`Cannot subtract ${vd2} value from ${vd1} value`);
        }
        let code = '', degree;
        if (this.isScalar) {
            code = `f.sub(${this.code}, ${e.code})`;
            degree = maxDegree(this.degree, e.degree);
        }
        else if (this.isVector) {
            code = `f.subVectorElements(${this.code}, ${e.code})`;
            degree = vectorDegree(maxDegree, this.degree, e.degree);
        }
        else {
            code = `f.subMatrixElements(${this.code}, ${e.code})`;
            degree = matrixDegree(maxDegree, this.degree, e.degree);
        }
        return new Expression(code, this.dimensions, degree);
    }
    mul(e) {
        if (!e.isScalar && !this.isSameDimensions(e)) {
            const vd1 = `${this.dimensions[0]}x${this.dimensions[1]}`;
            const vd2 = `${e.dimensions[0]}x${e.dimensions[1]}`;
            throw new Error(`Cannot multiply ${vd1} value by ${vd2} value`);
        }
        let code = '', degree;
        if (this.isScalar) {
            code = `f.mul(${this.code}, ${e.code})`;
            degree = addDegree(this.degree, e.degree);
        }
        else if (this.isVector) {
            code = `f.mulVectorElements(${this.code}, ${e.code})`;
            degree = vectorDegree(addDegree, this.degree, e.degree);
        }
        else {
            code = `f.mulMatrixElements(${this.code}, ${e.code})`;
            degree = matrixDegree(addDegree, this.degree, e.degree);
        }
        return new Expression(code, this.dimensions, degree);
    }
    div(e) {
        if (!e.isScalar && !this.isSameDimensions(e)) {
            const vd1 = `${this.dimensions[0]}x${this.dimensions[1]}`;
            const vd2 = `${e.dimensions[0]}x${e.dimensions[1]}`;
            throw new Error(`Cannot divide ${vd1} value by ${vd2} value`);
        }
        let code = '', degree;
        if (this.isScalar) {
            code = `f.div(${this.code}, ${e.code})`;
            degree = addDegree(this.degree, e.degree);
        }
        else if (this.isVector) {
            code = `f.divVectorElements(${this.code}, ${e.code})`;
            degree = vectorDegree(addDegree, this.degree, e.degree);
        }
        else {
            code = `f.divMatrixElements(${this.code}, ${e.code})`;
            degree = matrixDegree(addDegree, this.degree, e.degree);
        }
        return new Expression(code, this.dimensions, degree);
    }
    exp(e) {
        if (!e.isScalar) {
            throw new Error(`Cannot raise to non-scalar power`);
        }
        if (e instanceof StaticExpression_1.StaticExpression === false) {
            throw new Error(`Cannot raise to non-static power`);
        }
        const eValue = e.value;
        let code = '', degree;
        if (this.isScalar) {
            code = `f.exp(${this.code}, ${e.code})`;
            degree = mulDegree(this.degree, eValue);
        }
        else if (this.isVector) {
            code = `f.expVectorElements(${this.code}, ${e.code})`;
            degree = vectorDegree(mulDegree, this.degree, eValue);
        }
        else {
            code = `f.expMatrixElements(${this.code}, ${e.code})`;
            degree = matrixDegree(mulDegree, this.degree, eValue);
        }
        return new Expression(code, this.dimensions, degree);
    }
    prod(e) {
        const d1 = this.dimensions;
        const d2 = e.dimensions;
        let code = '', dimensions, degree;
        if (this.isVector && e.isVector) {
            if (d1[0] !== d2[0]) {
                throw new Error(`Cannot compute a product of ${d1[0]}x${d1[1]} and ${d2[0]}x${d2[1]} values`);
            }
            code = `f.combineVectors(${this.code}, ${e.code})`;
            dimensions = [0, 0];
            degree = linearCombinationDegree(this.degree, e.degree);
        }
        else if (this.isMatrix && e.isVector) {
            if (d1[1] !== d2[0]) {
                throw new Error(`Cannot compute a product of ${d1[0]}x${d1[1]} and ${d2[0]}x${d2[1]} values`);
            }
            code = `f.mulMatrixByVector(${this.code}, ${e.code})`;
            dimensions = [d1[0], 0];
            degree = matrixVectorProductDegree(this.degree, e.degree);
        }
        else {
            if (d1[1] !== d2[0]) {
                throw new Error(`Cannot compute a product of ${d1[0]}x${d1[1]} and ${d2[0]}x${d2[1]} values`);
            }
            code = `f.mulMatrixes(${this.code}, ${e.code})`;
            dimensions = [d1[0], d2[1]];
            degree = matrixMatrixProductDegree(this.degree, e.degree);
        }
        return new Expression(code, dimensions, degree);
    }
}
// STATIC EXPRESSIONS
// --------------------------------------------------------------------------------------------
Expression.one = new Expression('f.one', [0, 0], 0n);
Expression.zero = new Expression('f.zero', [0, 0], 0n);
exports.Expression = Expression;
// HELPER FUNCTIONS
// ================================================================================================
function maxDegree(d1, d2) {
    if (d1 > d2)
        return d1;
    else
        return d2;
}
function addDegree(d1, d2) {
    return d1 + d2;
}
function mulDegree(d1, d2) {
    return d1 * d2;
}
function vectorDegree(op, d1, d2) {
    const result = new Array(d1.length);
    for (let i = 0; i < d1.length; i++) {
        let v2 = (typeof d2 === 'bigint' ? d2 : d2[i]);
        result[i] = op(d1[i], v2);
    }
    return result;
}
function matrixDegree(op, d1, d2) {
    const result = new Array(d1.length);
    for (let i = 0; i < d1.length; i++) {
        result[i] = new Array(d1[i].length);
        for (let j = 0; j < d1[i].length; j++) {
            let v2 = (typeof d2 === 'bigint' ? d2 : d2[i][j]);
            result[i][j] = op(d1[i][j], v2);
        }
    }
    return result;
}
function linearCombinationDegree(d1, d2) {
    let result = 0n;
    for (let i = 0; i < d1.length; i++) {
        let d = addDegree(d1[i], d2[i]);
        if (d > result) {
            result = d;
        }
    }
    return result;
}
function matrixVectorProductDegree(d1, d2) {
    const result = new Array();
    for (let row of d1) {
        result.push(linearCombinationDegree(row, d2));
    }
    return result;
}
function matrixMatrixProductDegree(d1, d2) {
    const n = d1.length;
    const m = d1[0].length;
    const p = d2[0].length;
    const result = new Array(n);
    for (let i = 0; i < n; i++) {
        let row = result[i] = new Array(p);
        for (let j = 0; j < p; j++) {
            let s = 0n;
            for (let k = 0; k < m; k++) {
                let d = addDegree(d1[i][k], d2[k][j]);
                if (d > s) {
                    s = d;
                }
                ;
            }
            row[j] = s;
        }
    }
    return result;
}
//# sourceMappingURL=Expression.js.map