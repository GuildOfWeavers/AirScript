// CONSTANTS
// ================================================================================================
export const BLOCK_ID_PREFIX = '$_b';

export enum ProcedureParams {
    thisTraceRow = '$_r',
    nextTraceRow = '$_n',
    staticRow    = '$_k'
}

const MAX_SYMBOL_LENGTH = 128;
const SYMBOL_REGEXP = /[a-zA-Z]\w*/g;

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
    validate(name.length <= MAX_SYMBOL_LENGTH, `symbol '${name}' is invalid: symbol length cannot exceed ${MAX_SYMBOL_LENGTH} characters`);
    const matches = name.match(SYMBOL_REGEXP);
    validate(matches !== null && matches.length === 1, `symbol '${name}' is invalid`);
}