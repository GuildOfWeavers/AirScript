// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from "../Expression";

// INTERFACES
// ================================================================================================
export interface DegreeOp {
    (d1: bigint, d2: bigint): bigint;
}

// PUBLIC FUNCTIONS
// ================================================================================================
export function getDegree(lhs: Expression, rhsDegree: ExpressionDegree, op: DegreeOp): ExpressionDegree {
    if (lhs.isScalar) {
        return op(lhs.degree as bigint, rhsDegree as bigint);
    }
    else if (lhs.isVector) {
        return vectorDegree(op, lhs.degree as bigint[], rhsDegree as bigint | bigint[]);
    }
    else if (lhs.isMatrix) {
        return matrixDegree(op, lhs.degree as bigint[][], rhsDegree as bigint | bigint[][]);
    }
    else {
        throw new Error(''); // TODO
    }
}

export function maxDegree(d1: bigint, d2: bigint): bigint {
    if (d1 > d2) return d1;
    else return d2;
}

export function addDegree(d1: bigint, d2: bigint): bigint {
    return d1 + d2;
}

export function mulDegree(d1: bigint, d2: bigint): bigint {
    return d1 * d2;
}

export function linearCombinationDegree(d1: bigint[], d2: bigint[]): bigint {
    let result = 0n;
    for (let i = 0; i < d1.length; i++) {
        let d = addDegree(d1[i], d2[i]);
        if (d > result) { result = d; }
    }
    return result;
}

export function matrixVectorProductDegree(d1: bigint[][], d2: bigint[]): bigint[] {
    const result = new Array<bigint>();
    for (let row of d1) {
        result.push(linearCombinationDegree(row, d2));
    }
    return result;
}

export function matrixMatrixProductDegree(d1: bigint[][], d2: bigint[][]): bigint[][] {
    const n = d1.length;
    const m = d1[0].length;
    const p = d2[0].length;

    const result = new Array<bigint[]>(n);
    for (let i = 0; i < n; i++) {
        let row = result[i] = new Array<bigint>(p);
        for (let j = 0; j < p; j++) {
            let s = 0n;
            for (let k = 0; k < m; k++) {
                let d = addDegree(d1[i][k], d2[k][j]);
                if (d > s) { s = d };
            }
            row[j] = s;
        }
    }
    return result;
}

// HELPER FUNCTIONS
// ================================================================================================
function vectorDegree(op: DegreeOp, d1: bigint[], d2: bigint[] | bigint): bigint[] {
    const result = new Array<bigint>(d1.length);
    for (let i = 0; i < d1.length; i++) {
        let v2 = (typeof d2 === 'bigint'? d2 : d2[i]);
        result[i] = op(d1[i], v2);
    }
    return result;
}

function matrixDegree(op: DegreeOp, d1: bigint[][], d2: bigint[][] | bigint) {
    const result = new Array<bigint[]>(d1.length);
    for (let i = 0; i < d1.length; i++) {
        result[i] = new Array<bigint>(d1[i].length);
        for (let j = 0; j < d1[i].length; j++) {
            let v2 = (typeof d2 === 'bigint'? d2 : d2[i][j]);
            result[i][j] = op(d1[i][j], v2);
        }
    }
    return result;
}