"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// PUBLIC FUNCTIONS
// ================================================================================================
function getDegree(lhs, rhsDegree, op) {
    if (lhs.isScalar) {
        return op(lhs.degree, rhsDegree);
    }
    else if (lhs.isVector) {
        return vectorDegree(op, lhs.degree, rhsDegree);
    }
    else if (lhs.isMatrix) {
        return matrixDegree(op, lhs.degree, rhsDegree);
    }
    else {
        throw new Error(''); // TODO
    }
}
exports.getDegree = getDegree;
function maxDegree(d1, d2) {
    if (d1 > d2)
        return d1;
    else
        return d2;
}
exports.maxDegree = maxDegree;
function addDegree(d1, d2) {
    return d1 + d2;
}
exports.addDegree = addDegree;
function mulDegree(d1, d2) {
    return d1 * d2;
}
exports.mulDegree = mulDegree;
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
exports.linearCombinationDegree = linearCombinationDegree;
function matrixVectorProductDegree(d1, d2) {
    const result = new Array();
    for (let row of d1) {
        result.push(linearCombinationDegree(row, d2));
    }
    return result;
}
exports.matrixVectorProductDegree = matrixVectorProductDegree;
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
exports.matrixMatrixProductDegree = matrixMatrixProductDegree;
// HELPER FUNCTIONS
// ================================================================================================
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
//# sourceMappingURL=degree.js.map