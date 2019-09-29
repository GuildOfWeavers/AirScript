"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isScalar(dim) {
    return (dim[0] === 0 && dim[1] === 0);
}
exports.isScalar = isScalar;
function isVector(dim) {
    return (dim[0] > 0 && dim[1] === 0);
}
exports.isVector = isVector;
function isMatrix(dim) {
    return (dim[1] > 0);
}
exports.isMatrix = isMatrix;
function areSameDimensions(d1, d2) {
    return d1[0] === d2[0] && d1[1] === d2[1];
}
exports.areSameDimensions = areSameDimensions;
// OTHER
// ================================================================================================
function isPowerOf2(value) {
    if (typeof value === 'bigint') {
        return (value !== 0n) && (value & (value - 1n)) === 0n;
    }
    else {
        return (value !== 0) && (value & (value - 1)) === 0;
    }
}
exports.isPowerOf2 = isPowerOf2;
function validateVariableName(variable, dimensions) {
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
exports.validateVariableName = validateVariableName;
//# sourceMappingURL=utils.js.map