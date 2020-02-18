// IMPORTS
// ================================================================================================
import { Dimensions } from "@guildofweavers/air-assembly";
import { SymbolInfo, FunctionInfo, Interval } from "@guildofweavers/air-script";

// CONSTANTS
// ================================================================================================
export const BLOCK_ID_PREFIX = '$_b';

export const TRANSITION_FN_HANDLE = '$_transition';
export const EVALUATION_FN_HANDLE = '$_evaluation';

export enum ProcedureParams {
    thisTraceRow = '$_r',
    nextTraceRow = '$_n',
    staticRow    = '$_k'
}

const MAX_SYMBOL_LENGTH = 128;
const SYMBOL_REGEXP = /[a-zA-Z]\w*/g;

// DIMENSIONS
// ================================================================================================
export function areSameDimensions(d1: Dimensions, d2: Dimensions): boolean {
    return (d1[0] === d2[0]) && (d1[1] === d2[1]);
}

// DOMAINS
// ================================================================================================
export function isSubdomain(parent: Interval, child: Interval): boolean {
    return (parent[0] <= child[0] && parent[1] >= child[1]);
}

// SYMBOLS
// ================================================================================================
export function isFunctionInfoSymbol(symbol: SymbolInfo): symbol is FunctionInfo {
    return (symbol.type === 'func');
}

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