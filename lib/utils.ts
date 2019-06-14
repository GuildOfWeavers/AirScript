// CONTEXTS
// ================================================================================================
export interface StatementBlockContext {
    getVariableDimensions(variable: string): Dimensions | undefined;
    setVariableDimensions(variable: string, dimensions: Dimensions): void;
    buildRegisterReference(register: string): string;
}

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

// VARIABLE NAME
// ================================================================================================
export function validateVariableName(name: string, dimensions: Dimensions) {

    const errorMessage = `Variable name '${name}' is invalid`; 

    if (isScalar(dimensions)) {
        if (name != name.toLowerCase()) {
            throw new Error(`${errorMessage}: scalar variable names cannot contain uppercase characters`);
        }
    }
    else if (isVector(dimensions)) {
        if (name != name.toUpperCase()) {
            throw new Error(`${errorMessage}: vector variable names cannot contain lowercase characters`);
        }
    }
    else {
        if (name != name.toUpperCase()) {
            throw new Error(`${errorMessage}: matrix variable names cannot contain lowercase characters`);
        }
    }
}