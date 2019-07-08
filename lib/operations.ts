// IMPORTS
// ================================================================================================
import { Expression } from './visitor';
import { Dimensions, isScalar, isVector, isMatrix } from './utils';
import { tokenMatcher, IToken } from 'chevrotain';
import { Plus, Minus, Star, Slash, ExpOp, Pound } from './lexer';

// INTERFACES
// ================================================================================================
export interface OperationHandler {
    name: string;
    getDimensions (d1: Dimensions, d2: Dimensions): Dimensions;
    getCode(e1: Expression, e2: Expression): string;
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
    getDimensions (d1: Dimensions, d2: Dimensions): Dimensions {
        if (isScalar(d2)) return d1;                        
        else if (d1[0] === d2[0] && d1[1] === d2[1]) return d1;
        else throw new Error(`Cannot add ${d1[0]}x${d1[1]} value to ${d2[0]}x${d2[1]} value`);
    },
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        if (isScalar(d1))       return `f.add(${e1.code}, ${e2.code})`;
        else if (isVector(d1))  return `f.addVectorElements(${e1.code}, ${e2.code})`;
        else                    return `f.addMatrixElements(${e1.code}, ${e2.code})`;
    },
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;

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
    getDimensions (d1: Dimensions, d2: Dimensions): Dimensions {
        if (isScalar(d2)) return d1;                        
        else if (d1[0] === d2[0] && d1[1] === d2[1]) return d1;
        else throw new Error(`Cannot subtract ${d1[0]}x${d1[1]} value from ${d2[0]}x${d2[1]} value`);
    },
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        if (isScalar(d1))       return `f.sub(${e1.code}, ${e2.code})`;
        else if (isVector(d1))  return `f.subVectorElements(${e1.code}, ${e2.code})`;
        else                    return `f.subMatrixElements(${e1.code}, ${e2.code})`;
    },
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;

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
    getDimensions (d1: Dimensions, d2: Dimensions): Dimensions {
        if (isScalar(d2)) return d1;                        
        else if (d1[0] === d2[0] && d1[1] === d2[1]) return d1;
        else throw new Error(`Cannot multiply ${d1[0]}x${d1[1]} value by ${d2[0]}x${d2[1]} value`);
    },
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        if (isScalar(d1))       return `f.mul(${e1.code}, ${e2.code})`;
        else if (isVector(d1))  return `f.mulVectorElements(${e1.code}, ${e2.code})`;
        else                    return `f.mulMatrixElements(${e1.code}, ${e2.code})`;
    },
    getResult(e1: Expression, e2: Expression): Expression {
        const d1 = e1.dimensions;

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
    getDimensions (d1: Dimensions, d2: Dimensions): Dimensions {
        if (isScalar(d2)) return d1;                        
        else if (d1[0] === d2[0] && d1[1] === d2[1]) return d1;
        else throw new Error(`Cannot divide ${d1[0]}x${d1[1]} value by ${d2[0]}x${d2[1]} value`);
    },
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        if (isScalar(d1))       return `f.div(${e1.code}, ${e2.code})`;
        else if (isVector(d1))  return `f.divVectorElements(${e1.code}, ${e2.code})`;
        else                    return `f.divMatrixElements(${e1.code}, ${e2.code})`;
    }
};

// EXPONENTIATION
// ================================================================================================
const exponentiation = {
    name: 'exp',
    getDimensions (d1: Dimensions, d2: Dimensions): Dimensions {
        if (isScalar(d2)) return d1;
        else throw new Error(`Cannot raise to non-scalar power`);
    },
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        if (isScalar(d1))       return `f.exp(${e1.code}, ${e2.code})`;
        else if (isVector(d1))  return `f.expVectorElements(${e1.code}, ${e2.code})`;
        else                    return `f.expMatrixElements(${e1.code}, ${e2.code})`;
    }
};

// MATRIX AND VECTOR PRODUCT
// ================================================================================================
const product = {
    name: 'prod',
    getDimensions (d1: Dimensions, d2: Dimensions): Dimensions {
        if (isVector(d1) && isVector(d2) && d1[0] === d2[0]) return [0,0];
        else if (isMatrix(d1) && d1[1] === d2[0]) return [d1[0], d2[1]];
        else throw new Error(`Cannot compute a product of ${d1[0]}x${d1[1]} and ${d2[0]}x${d2[1]} values`);
    },
    getCode(e1: Expression, e2: Expression): string {
        const d1 = e1.dimensions;
        const d2 = e2.dimensions;
        if (isVector(d1) && isVector(d2))       return `f.combineVectors(${e1.code}, ${e2.code})`;
        else if (isMatrix(d1) && isVector(d2))  return `f.mulMatrixByVector(${e1.code}, ${e2.code})`;
        else                                    return `f.mulMatrixes(${e1.code}, ${e2.code})`;
    }
};