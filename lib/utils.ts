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