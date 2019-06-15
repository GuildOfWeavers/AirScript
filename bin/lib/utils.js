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
//# sourceMappingURL=utils.js.map