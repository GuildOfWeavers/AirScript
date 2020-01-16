"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CONSTANTS
// ================================================================================================
exports.SEGMENT_VAR_NAME = '$_s';
exports.BLOCK_ID_PREFIX = '$_b';
// MATH
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
// VALIDATORS
// ================================================================================================
function validate(condition, errorMessage) {
    if (!condition)
        throw new Error(errorMessage);
}
exports.validate = validate;
function validateSymbolName(name) {
    // TODO: check regex and length
}
exports.validateSymbolName = validateSymbolName;
//# sourceMappingURL=utils.js.map