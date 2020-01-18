// CONSTANTS
// ================================================================================================
export const CONTROLLER_NAME = '$_c';
export const BLOCK_ID_PREFIX = '$_b';

// MATH
// ================================================================================================
export function isPowerOf2(value: number | bigint): boolean {
    if (typeof value === 'bigint') {
        return (value !== 0n) && (value & (value - 1n)) === 0n;
    }
    else {
        return (value !== 0) && (value & (value - 1)) === 0;
    }
}

// VALIDATORS
// ================================================================================================
export function validate(condition: any, errorMessage: string): asserts condition {
    if (!condition) throw new Error(errorMessage);
}

export function validateSymbolName(name: string): void {
    // TODO: check regex and length
}