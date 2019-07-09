// IMPORTS
// ================================================================================================
import { Dimensions } from "./utils";

// INTERFACES
// ================================================================================================
export type ExpressionDegree = bigint | bigint[] | bigint[][];
export type ExpressionValue = bigint | bigint[] | bigint[][];

interface DegreeOp {
    (d1: bigint, d2: bigint): bigint;
}

// CLASS DEFINITION
// ================================================================================================
export class Expression {

    readonly code           : string;
    readonly dimensions     : Dimensions;
    readonly degree         : ExpressionDegree;
    readonly destructured   : boolean;
    readonly value?         : ExpressionValue;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(code: string, dimensions: Dimensions, degree: ExpressionDegree, destructured = false) {
        this.code = code;
        this.dimensions = dimensions;
        this.degree = degree;
        this.destructured = destructured;
    }

    static literal(value: string): Expression {
        const parsedValue = BigInt(value);  // TODO: pass to constructor?
        return new Expression(`${value}n`, [0, 0], 0n);
    }

    static constant(name: string, dimensions: Dimensions, value: ExpressionValue): Expression {
        // TODO: build degree based on dimensions
        return new Expression(`g.${name}`, dimensions, 0n);
    }

    static variable(name: string, dimensions: Dimensions, degree: ExpressionDegree) {
        return new Expression(`$${name}`, dimensions, degree);
    }

    static register(name: string, index: number): Expression {
        return new Expression(`${name}[${index}]`, [0, 0], 1n);
    }

    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isConstant(): boolean {
        return this.degree === 0n;
    }

    // DIMENSION METHODS AND ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isScalar(): boolean {
        return (this.dimensions[0] === 0 && this.dimensions[1] === 0);
    }

    get isVector(): boolean {
        return (this.dimensions[0] > 0 && this.dimensions[1] === 0);
    }

    get isMatrix(): boolean {
        return (this.dimensions[1] > 0);
    }

    isSameDimensions(e: Expression) {
        return this.dimensions[0] === e.dimensions[0]
            && this.dimensions[1] === e.dimensions[1];
    }

    // ARITHMETIC OPERATIONS
    // --------------------------------------------------------------------------------------------
    add(e: Expression): Expression {
        if (!e.isScalar && !this.isSameDimensions(e)) {
            const vd1 = `${this.dimensions[0]}x${this.dimensions[1]}`;
            const vd2 = `${e.dimensions[0]}x${e.dimensions[1]}`;
            throw new Error(`Cannot add ${vd2} value to ${vd1} value`);
        }

        let code = '', degree: ExpressionDegree;
        if (this.isScalar) {
            code = `f.add(${this.code}, ${e.code})`;
            degree = maxDegree(this.degree as bigint, e.degree as bigint);
        }
        else if (this.isVector) {
            code = `f.addVectorElements(${this.code}, ${e.code})`;
            degree = vectorDegree(maxDegree, this.degree as bigint[], e.degree as bigint | bigint[]);
        }
        else {
            code = `f.addMatrixElements(${this.code}, ${e.code})`;
            degree = matrixDegree(maxDegree, this.degree as bigint[][], e.degree as bigint | bigint[][]);
        }

        return new Expression(code, this.dimensions, degree);
    }

    sub(e: Expression): Expression {
        if (!e.isScalar && !this.isSameDimensions(e)) {
            const vd1 = `${this.dimensions[0]}x${this.dimensions[1]}`;
            const vd2 = `${e.dimensions[0]}x${e.dimensions[1]}`;
            throw new Error(`Cannot subtract ${vd2} value from ${vd1} value`);
        }

        let code = '', degree: ExpressionDegree;
        if (this.isScalar) {
            code = `f.sub(${this.code}, ${e.code})`;
            degree = maxDegree(this.degree as bigint, e.degree as bigint);
        }
        else if (this.isVector) {
            code = `f.subVectorElements(${this.code}, ${e.code})`;
            degree = vectorDegree(maxDegree, this.degree as bigint[], e.degree as bigint | bigint[]);
        }
        else {
            code = `f.subMatrixElements(${this.code}, ${e.code})`;
            degree = matrixDegree(maxDegree, this.degree as bigint[][], e.degree as bigint | bigint[][]);
        }

        return new Expression(code, this.dimensions, degree);
    }

    mul(e: Expression): Expression {
        if (!e.isScalar && !this.isSameDimensions(e)) {
            const vd1 = `${this.dimensions[0]}x${this.dimensions[1]}`;
            const vd2 = `${e.dimensions[0]}x${e.dimensions[1]}`;
            throw new Error(`Cannot multiply ${vd1} value by ${vd2} value`);
        }

        let code = '', degree: ExpressionDegree;
        if (this.isScalar) {
            code = `f.mul(${this.code}, ${e.code})`;
            degree = addDegree(this.degree as bigint, e.degree as bigint);
        }
        else if (this.isVector) {
            code = `f.mulVectorElements(${this.code}, ${e.code})`;
            degree = vectorDegree(addDegree, this.degree as bigint[], e.degree as bigint | bigint[]);
        }
        else {
            code = `f.mulMatrixElements(${this.code}, ${e.code})`;
            degree = matrixDegree(addDegree, this.degree as bigint[][], e.degree as bigint | bigint[][]);
        }

        return new Expression(code, this.dimensions, degree);
    }

    div(e: Expression): Expression {
        if (!e.isScalar && !this.isSameDimensions(e)) {
            const vd1 = `${this.dimensions[0]}x${this.dimensions[1]}`;
            const vd2 = `${e.dimensions[0]}x${e.dimensions[1]}`;
            throw new Error(`Cannot divide ${vd1} value by ${vd2} value`);
        }

        let code = '', degree: ExpressionDegree;
        if (this.isScalar) {
            code = `f.div(${this.code}, ${e.code})`;
            degree = addDegree(this.degree as bigint, e.degree as bigint);
        }
        else if (this.isVector) {
            code = `f.divVectorElements(${this.code}, ${e.code})`;
            degree = vectorDegree(addDegree, this.degree as bigint[], e.degree as bigint | bigint[]);
        }
        else {
            code = `f.divMatrixElements(${this.code}, ${e.code})`;
            degree = matrixDegree(addDegree, this.degree as bigint[][], e.degree as bigint | bigint[][]);
        }

        return new Expression(code, this.dimensions, degree);
    }

    exp(e: Expression): Expression {
        if (!e.isScalar) {
            throw new Error(`Cannot raise to non-scalar power`);
        }

        let code = '', degree: ExpressionDegree;
        if (this.isScalar) {
            code = `f.exp(${this.code}, ${e.code})`;
            degree = mulDegree(this.degree as bigint, 3n);    // TODO: get value for e2
        }
        else if (this.isVector) {
            code = `f.expVectorElements(${this.code}, ${e.code})`;
            degree = vectorDegree(mulDegree, this.degree as bigint[], 3n); // TODO: get value for e2
        }
        else {
            code = `f.expMatrixElements(${this.code}, ${e.code})`;
            degree = matrixDegree(mulDegree, this.degree as bigint[][], 3n); // TODO: get value for e2
        }

        return new Expression(code, this.dimensions, degree);
    }

    prod(e: Expression): Expression {
        const d1 = this.dimensions;
        const d2 = e.dimensions;

        let code = '', dimensions: Dimensions, degree: ExpressionDegree;
        if (this.isVector && e.isVector) {
            if (d1[0] !== d2[0]) {
                throw new Error(`Cannot compute a product of ${d1[0]}x${d1[1]} and ${d2[0]}x${d2[1]} values`);
            }
            code = `f.combineVectors(${this.code}, ${e.code})`;
            dimensions = [0, 0];
        }
        else if (this.isMatrix && e.isVector) {
            if (d1[1] !== d2[0]) {
                throw new Error(`Cannot compute a product of ${d1[0]}x${d1[1]} and ${d2[0]}x${d2[1]} values`);
            }
            code = `f.mulMatrixByVector(${this.code}, ${e.code})`;
            dimensions = [d1[0], 0];
        }
        else {
            if (d1[1] !== d2[0]) {
                throw new Error(`Cannot compute a product of ${d1[0]}x${d1[1]} and ${d2[0]}x${d2[1]} values`);
            }
            code = `f.mulMatrixes(${this.code}, ${e.code})`;
            dimensions = [d1[0], d2[1]];
        }

        degree = [3n]; // TODO: calculate

        return new Expression(code, this.dimensions, degree);
    }

    // STATIC EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    static one = new Expression('f.one', [0, 0], 0n);
    static zero = new Expression('f.zero', [0, 0], 0n);
}

// HELPER FUNCTIONS
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