// IMPORTS
// ================================================================================================
import { Expression } from './visitor';
import { Dimensions, isScalar, isVector, isMatrix, areSameDimension } from './utils';
import { tokenMatcher, IToken } from 'chevrotain';
import { Plus, Minus, Star, Slash, ExpOp, Pound } from './lexer';

// INTERFACES
// ================================================================================================
export interface OperationHandler {
    name: string;
    getCode(e1: Expression, e2: Expression): string;
    getResult(e1: Expression, e2: Expression): Expression;
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
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        if (isScalar(d1))       return `f.add(${e1.code}, ${e2.code})`;
        else if (isVector(d1))  return `f.addVectorElements(${e1.code}, ${e2.code})`;
        else                    return `f.addMatrixElements(${e1.code}, ${e2.code})`;
    },
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;

        if (!isScalar(d2) && !areSameDimension(d1, d2)) {
            throw new Error(`Cannot add ${d1[0]}x${d1[1]} value to ${d2[0]}x${d2[1]} value`);
        }

        let code = '';
        if (isScalar(d1)) {
            code = `f.add(${e1.code}, ${e2.code})`;
        }
        else if (isVector(d1)) {
            code = `f.addVectorElements(${e1.code}, ${e2.code})`;
        }
        else {
            code = `f.addMatrixElements(${e1.code}, ${e2.code})`;
        }

        return { code, dimensions: d1 };
    }
};

// SUBTRACTION
// ================================================================================================
export const subtraction = {
    name: 'sub',
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        if (isScalar(d1))       return `f.sub(${e1.code}, ${e2.code})`;
        else if (isVector(d1))  return `f.subVectorElements(${e1.code}, ${e2.code})`;
        else                    return `f.subMatrixElements(${e1.code}, ${e2.code})`;
    },
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;

        if (!isScalar(d2) && !areSameDimension(d1, d2)) {
            throw new Error(`Cannot subtract ${d1[0]}x${d1[1]} value from ${d2[0]}x${d2[1]} value`);
        }

        let code = '';
        if (isScalar(d1)) {
            code = `f.sub(${e1.code}, ${e2.code})`;
        }
        else if (isVector(d1)) {
            code = `f.subVectorElements(${e1.code}, ${e2.code})`;
        }
        else {
            code = `f.subMatrixElements(${e1.code}, ${e2.code})`;
        }

        return { code, dimensions: d1 };
    }
};

// MULTIPLICATION
// ================================================================================================
export const multiplication = {
    name: 'mul',
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        if (isScalar(d1))       return `f.mul(${e1.code}, ${e2.code})`;
        else if (isVector(d1))  return `f.mulVectorElements(${e1.code}, ${e2.code})`;
        else                    return `f.mulMatrixElements(${e1.code}, ${e2.code})`;
    },
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;

        if (!isScalar(d2) && !areSameDimension(d1, d2)) {
            throw new Error(`Cannot multiply ${d1[0]}x${d1[1]} value by ${d2[0]}x${d2[1]} value`);
        }

        let code = '';
        if (isScalar(d1)) {
            code = `f.mul(${e1.code}, ${e2.code})`;
        }
        else if (isVector(d1)) {
            code = `f.mulVectorElements(${e1.code}, ${e2.code})`;
        }
        else {
            code = `f.mulMatrixElements(${e1.code}, ${e2.code})`;
        }

        return { code, dimensions: d1 };
    }
};

// DIVISION
// ================================================================================================
const division = {
    name: 'div',
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        if (isScalar(d1))       return `f.div(${e1.code}, ${e2.code})`;
        else if (isVector(d1))  return `f.divVectorElements(${e1.code}, ${e2.code})`;
        else                    return `f.divMatrixElements(${e1.code}, ${e2.code})`;
    },
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;

        if (!isScalar(d2) && !areSameDimension(d1, d2)) {
            throw new Error(`Cannot divide ${d1[0]}x${d1[1]} value by ${d2[0]}x${d2[1]} value`);
        }

        let code = '';
        if (isScalar(d1)) {
            code = `f.div(${e1.code}, ${e2.code})`;
        }
        else if (isVector(d1)) {
            code = `f.divVectorElements(${e1.code}, ${e2.code})`;
        }
        else {
            code = `f.divMatrixElements(${e1.code}, ${e2.code})`;
        }

        return { code, dimensions: d1 };
    }
};

// EXPONENTIATION
// ================================================================================================
const exponentiation = {
    name: 'exp',
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        if (isScalar(d1))       return `f.exp(${e1.code}, ${e2.code})`;
        else if (isVector(d1))  return `f.expVectorElements(${e1.code}, ${e2.code})`;
        else                    return `f.expMatrixElements(${e1.code}, ${e2.code})`;
    },
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;

        if (!isScalar(d2)) {
            throw new Error(`Cannot raise to non-scalar power`);
        }

        let code = '';
        if (isScalar(d1)) {
            code = `f.exp(${e1.code}, ${e2.code})`;
        }
        else if (isVector(d1)) {
            code = `f.expVectorElements(${e1.code}, ${e2.code})`;
        }
        else {
            code = `f.expMatrixElements(${e1.code}, ${e2.code})`;
        }

        return { code, dimensions: d1 };
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

        let code = '', dimensions: Dimensions;
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

        return { code, dimensions };
    }
};