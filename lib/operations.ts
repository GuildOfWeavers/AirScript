// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from './visitor';
import { Dimensions, isScalar, isVector, isMatrix, areSameDimension } from './utils';
import { tokenMatcher, IToken } from 'chevrotain';
import { Plus, Minus, Star, Slash, ExpOp, Pound } from './lexer';

// INTERFACES
// ================================================================================================
export interface OperationHandler {
    name: string;
    getResult(e1: Expression, e2: Expression): Expression;
}

interface DegreeOp {
    (d1: bigint, d2: bigint): bigint;
}

// PUBLIC FUNCTIONS
// ================================================================================================
export function getOperationHandler(token: IToken): OperationHandler {
    if (tokenMatcher(token, Plus))          return addition;
    else if (tokenMatcher(token, Minus))    return subtraction;
    else if (tokenMatcher(token, Star))     return multiplication;
    else if (tokenMatcher(token, Slash))    return division;
    else if (tokenMatcher(token, ExpOp))    return exponentiation;
    else if (tokenMatcher(token, Pound))    return product;
    else throw new Error(`Invalid operator '${token.image}'`);
}

// ADDITION
// ================================================================================================
export const addition = {
    name: 'add',
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;

        if (!isScalar(d2) && !areSameDimension(d1, d2)) {
            throw new Error(`Cannot add ${d1[0]}x${d1[1]} value to ${d2[0]}x${d2[1]} value`);
        }

        let code = '', degree: ExpressionDegree;
        if (isScalar(d1)) {
            code = `f.add(${e1.code}, ${e2.code})`;
            degree = maxDegree(e1.degree as bigint, e2.degree as bigint);
        }
        else if (isVector(d1)) {
            code = `f.addVectorElements(${e1.code}, ${e2.code})`;
            degree = vectorDegree(maxDegree, e1.degree as bigint[], e2.degree as bigint | bigint[]);
        }
        else {
            code = `f.addMatrixElements(${e1.code}, ${e2.code})`;
            degree = matrixDegree(maxDegree, e1.degree as bigint[][], e2.degree as bigint | bigint[][]);
        }

        return { code, dimensions: d1, degree };
    }
};

// SUBTRACTION
// ================================================================================================
export const subtraction = {
    name: 'sub',
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;

        if (!isScalar(d2) && !areSameDimension(d1, d2)) {
            throw new Error(`Cannot subtract ${d1[0]}x${d1[1]} value from ${d2[0]}x${d2[1]} value`);
        }

        let code = '', degree: ExpressionDegree;
        if (isScalar(d1)) {
            code = `f.sub(${e1.code}, ${e2.code})`;
            degree = maxDegree(e1.degree as bigint, e2.degree as bigint);
        }
        else if (isVector(d1)) {
            code = `f.subVectorElements(${e1.code}, ${e2.code})`;
            degree = vectorDegree(maxDegree, e1.degree as bigint[], e2.degree as bigint | bigint[]);
        }
        else {
            code = `f.subMatrixElements(${e1.code}, ${e2.code})`;
            degree = matrixDegree(maxDegree, e1.degree as bigint[][], e2.degree as bigint | bigint[][]);
        }

        return { code, dimensions: d1, degree };
    }
};

// MULTIPLICATION
// ================================================================================================
export const multiplication = {
    name: 'mul',
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;

        if (!isScalar(d2) && !areSameDimension(d1, d2)) {
            throw new Error(`Cannot multiply ${d1[0]}x${d1[1]} value by ${d2[0]}x${d2[1]} value`);
        }

        let code = '', degree: ExpressionDegree;
        if (isScalar(d1)) {
            code = `f.mul(${e1.code}, ${e2.code})`;
            degree = addDegree(e1.degree as bigint, e2.degree as bigint);
        }
        else if (isVector(d1)) {
            code = `f.mulVectorElements(${e1.code}, ${e2.code})`;
            degree = vectorDegree(addDegree, e1.degree as bigint[], e2.degree as bigint | bigint[]);
        }
        else {
            code = `f.mulMatrixElements(${e1.code}, ${e2.code})`;
            degree = matrixDegree(addDegree, e1.degree as bigint[][], e2.degree as bigint | bigint[][]);
        }

        return { code, dimensions: d1, degree };
    }
};

// DIVISION
// ================================================================================================
const division = {
    name: 'div',
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;

        if (!isScalar(d2) && !areSameDimension(d1, d2)) {
            throw new Error(`Cannot divide ${d1[0]}x${d1[1]} value by ${d2[0]}x${d2[1]} value`);
        }

        let code = '', degree: ExpressionDegree;
        if (isScalar(d1)) {
            code = `f.div(${e1.code}, ${e2.code})`;
            degree = addDegree(e1.degree as bigint, e2.degree as bigint);
        }
        else if (isVector(d1)) {
            code = `f.divVectorElements(${e1.code}, ${e2.code})`;
            degree = vectorDegree(addDegree, e1.degree as bigint[], e2.degree as bigint | bigint[]);
        }
        else {
            code = `f.divMatrixElements(${e1.code}, ${e2.code})`;
            degree = matrixDegree(addDegree, e1.degree as bigint[][], e2.degree as bigint | bigint[][]);
        }

        return { code, dimensions: d1, degree };
    }
};

// EXPONENTIATION
// ================================================================================================
const exponentiation = {
    name: 'exp',
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;

        if (!isScalar(d2)) {
            throw new Error(`Cannot raise to non-scalar power`);
        }

        let code = '', degree: ExpressionDegree;
        if (isScalar(d1)) {
            code = `f.exp(${e1.code}, ${e2.code})`;
            degree = mulDegree(e1.degree as bigint, 3n);    // TODO: get value for e2
        }
        else if (isVector(d1)) {
            code = `f.expVectorElements(${e1.code}, ${e2.code})`;
            degree = vectorDegree(mulDegree, e1.degree as bigint[], 3n); // TODO: get value for e2
        }
        else {
            code = `f.expMatrixElements(${e1.code}, ${e2.code})`;
            degree = matrixDegree(mulDegree, e1.degree as bigint[][], 3n); // TODO: get value for e2
        }

        return { code, dimensions: d1, degree };
    }
};

// MATRIX AND VECTOR PRODUCT
// ================================================================================================
const product = {
    name: 'prod',
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;
        if (isVector(d1) && isVector(d2))       return `f.combineVectors(${e1.code}, ${e2.code})`;
        else if (isMatrix(d1) && isVector(d2))  return `f.mulMatrixByVector(${e1.code}, ${e2.code})`;
        else                                    return `f.mulMatrixes(${e1.code}, ${e2.code})`;
    },
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;

        let code = '', dimensions: Dimensions, degree: ExpressionDegree;
        if (isVector(d1) && isVector(d2)) {
            if (d1[0] !== d2[0]) {
                throw new Error(`Cannot compute a product of ${d1[0]}x${d1[1]} and ${d2[0]}x${d2[1]} values`);
            }
            code = `f.combineVectors(${e1.code}, ${e2.code})`;
            dimensions = [0, 0];
        }
        else if (isMatrix(d1) && isVector(d2)) {
            if (d1[1] !== d2[0]) {
                throw new Error(`Cannot compute a product of ${d1[0]}x${d1[1]} and ${d2[0]}x${d2[1]} values`);
            }
            code = `f.mulMatrixByVector(${e1.code}, ${e2.code})`;
            dimensions = [d1[0], 0];
        }
        else {
            if (d1[1] !== d2[0]) {
                throw new Error(`Cannot compute a product of ${d1[0]}x${d1[1]} and ${d2[0]}x${d2[1]} values`);
            }
            code = `f.mulMatrixes(${e1.code}, ${e2.code})`;
            dimensions = [d1[0], d2[1]];
        }

        degree = [3n]; // TODO: calculate

        return { code, dimensions, degree };
    }
};

// EXPRESSION DEGREE
// ================================================================================================
function maxDegree(d1: bigint, d2: bigint): bigint {
    if (d1 > d2) return d1;
    else return d2;
}

function addDegree(d1: bigint, d2: bigint): bigint {
    return d1 + d2;
}

function mulDegree(d1: bigint, d2: bigint): bigint {
    return d1 * d2;
}

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

