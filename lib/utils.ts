// DIMENSIONS
// ================================================================================================
// [rows, columns]
export type Dimensions = [number, number];

export function isScalar(dim: Dimensions) {
    return (dim[0] === 0 && dim[1] === 0);
}

export function isVector(dim: Dimensions) {
    return (dim[0] > 0 && dim[1] === 0);
}

export function isMatrix(dim: Dimensions) {
    return (dim[1] > 0);
}

export function areSameDimensions(d1: Dimensions, d2: Dimensions) {
    return d1[0] === d2[0] && d1[1] === d2[1];
}

// DEGREE
// ================================================================================================
export type ExpressionDegree = bigint | bigint[] | bigint[][];

export function degreeToDimensions(degree: ExpressionDegree): Dimensions {
    if (typeof degree === 'bigint') {
        // degree describes a scalar
        return [0, 0];
    }

    if (!Array.isArray(degree)) throw new Error(`degree '${degree}' is invalid`);
    if (degree.length === 0) throw new Error(`degree '${degree}' is invalid`);

    if (typeof degree[0] === 'bigint') {
        // degree describes a vector
        return [degree.length, 0];
    }

    let colCount = 0;
    for (let row of degree) {
        if (!Array.isArray(row)) throw new Error(`degree '${degree}' is invalid`);
        if (!colCount)
            colCount = row.length;
        else if (colCount !== row.length)
            throw new Error(`degree '${degree}' is invalid`);
    }

    if (!colCount) throw new Error(`degree '${degree}' is invalid`);

    // degree describes a matrix
    return [degree.length, colCount];
}

// OTHER
// ================================================================================================
export function isPowerOf2(value: number | bigint): boolean {
    if (typeof value === 'bigint') {
        return (value !== 0n) && (value & (value - 1n)) === 0n;
    }
    else {
        return (value !== 0) && (value & (value - 1)) === 0;
    }
}

export function validateVariableName(variable: string, dimensions: Dimensions) {

    const errorMessage = `Variable name '${variable}' is invalid:`;

    if (isScalar(dimensions)) {
        if (variable != variable.toLowerCase()) {
            throw new Error(`${errorMessage} scalar variable names cannot contain uppercase characters`);
        }
    }
    else if (isVector(dimensions)) {
        if (variable != variable.toUpperCase()) {
            throw new Error(`${errorMessage} vector variable names cannot contain lowercase characters`);
        }
    }
    else {
        if (variable != variable.toUpperCase()) {
            throw new Error(`${errorMessage} matrix variable names cannot contain lowercase characters`);
        }
    }
}