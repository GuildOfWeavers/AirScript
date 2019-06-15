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
//# sourceMappingURL=utils.js.map