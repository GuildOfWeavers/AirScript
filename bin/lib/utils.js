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
// VARIABLE NAME
// ================================================================================================
function validateVariableName(name, dimensions) {
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
exports.validateVariableName = validateVariableName;
//# sourceMappingURL=utils.js.map