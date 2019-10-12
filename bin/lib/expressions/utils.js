"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InputBlock_1 = require("./loops/InputBlock");
const SegmentLoopBlock_1 = require("./loops/SegmentLoopBlock");
// LOOPS
// ================================================================================================
function getInputBlockStructure(inputBlock) {
    const baseCycleMasks = [];
    const registerDepths = new Array(inputBlock.registers.size).fill(0);
    while (true) {
        if (inputBlock.bodyExpression instanceof InputBlock_1.InputBlock) {
            inputBlock = inputBlock.bodyExpression;
            for (let register of inputBlock.registers) {
                registerDepths[register]++;
            }
        }
        else if (inputBlock.bodyExpression instanceof SegmentLoopBlock_1.SegmentLoopBlock) {
            inputBlock.bodyExpression.masks.forEach(mask => baseCycleMasks.push(mask));
            break;
        }
        else {
            throw Error('invalid expression in input block body');
        }
    }
    const baseCycleLength = baseCycleMasks[0].length;
    return { registerDepths, baseCycleMasks, baseCycleLength };
}
exports.getInputBlockStructure = getInputBlockStructure;
// DEGREE
// ================================================================================================
function maxDegree(d1, d2) {
    if (typeof d1 === 'bigint') {
        if (typeof d2 !== 'bigint')
            throw new Error('cannot infer max degree');
        return (d1 > d2 ? d1 : d2);
    }
    else if (typeof d1[0] === 'bigint') {
        return vectorDegree((a, b) => (a > b ? a : b), d1, d2);
    }
    else {
        return matrixDegree((a, b) => (a > b ? a : b), d1, d2);
    }
}
exports.maxDegree = maxDegree;
function sumDegree(d1, d2) {
    if (typeof d1 === 'bigint') {
        if (typeof d2 !== 'bigint')
            throw new Error('cannot infer sum degree');
        return d1 + d2;
    }
    else if (typeof d1[0] === 'bigint') {
        return vectorDegree((a, b) => (a + b), d1, d2);
    }
    else {
        return matrixDegree((a, b) => (a + b), d1, d2);
    }
}
exports.sumDegree = sumDegree;
function mulDegree(d1, d2) {
    if (typeof d1 === 'bigint') {
        if (typeof d2 !== 'bigint')
            throw new Error('cannot infer mul degree');
        return d1 * d2;
    }
    else if (typeof d1[0] === 'bigint') {
        return vectorDegree((a, b) => (a * b), d1, d2);
    }
    else {
        return matrixDegree((a, b) => (a * b), d1, d2);
    }
}
exports.mulDegree = mulDegree;
function linearCombinationDegree(d1, d2) {
    let result = 0n;
    for (let i = 0; i < d1.length; i++) {
        let d = d1[i] + d2[i];
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
                let d = d1[i][k] + d2[k][j];
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
//# sourceMappingURL=utils.js.map