// IMPORTS
// ================================================================================================
import { StarkLimits, ScriptOptions, WasmOptions } from '@guildofweavers/air-script';
import { lexer } from './lib/lexer';
import { parser } from './lib/parser';
import { visitor } from './lib/visitor';
import { AirObject, AirConfig } from './lib/AirObject';
import { AirScriptError } from './lib/errors';
import { isPowerOf2 } from './lib/utils';

// MODULE VARIABLES
// ================================================================================================
const DEFAULT_LIMITS: StarkLimits = {
    maxSteps                : 2**20,
    maxMutableRegisters     : 64,
    maxReadonlyRegisters    : 64,
    maxConstraintCount      : 1024,
    maxConstraintDegree     : 16,
    maxExtensionFactor      : 32
};

// PUBLIC FUNCTIONS
// ================================================================================================
export function parseScript(script: string, limits?: Partial<StarkLimits>, options?: Partial<ScriptOptions>): AirObject {
    // apply defaults
    limits = {...DEFAULT_LIMITS, ...limits};

    // tokenize input
    const lexResult = lexer.tokenize(script);
    if(lexResult.errors.length > 0) {
        throw new AirScriptError(lexResult.errors);
    }

    // apply grammar rules
    parser.input = lexResult.tokens;
    const cst = parser.script();
    if (parser.errors.length > 0) {
        throw new AirScriptError(parser.errors);
    }

    // build STARK config
    try {
        let extensionFactor: number | undefined;
        let wasmOptions: Partial<WasmOptions> | null | undefined;
        if (options) {
            extensionFactor = options.extensionFactor;
            wasmOptions = options.wasmOptions;
        }

        const airConfig: AirConfig = visitor.visit(cst, { limits, wasmOptions });
        const air = new AirObject(airConfig, extensionFactor);
        validateExtensionFactor(air.extensionFactor, air.maxConstraintDegree, limits.maxExtensionFactor!);
        return air;
    }
    catch (error) {
        throw new AirScriptError([error]);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function validateExtensionFactor(extensionFactor: number, maxConstraintDegree: number, maxExtensionFactor: number) {

    const minExtensionFactor = 2**Math.ceil(Math.log2(maxConstraintDegree * 2));

    if (extensionFactor > maxExtensionFactor || !Number.isInteger(extensionFactor)) {
        throw new TypeError(`Extension factor must be an integer smaller than or equal to ${maxExtensionFactor}`);
    }

    if (!isPowerOf2(extensionFactor)) {
        throw new TypeError(`Extension factor must be a power of 2`);
    }

    if (extensionFactor < minExtensionFactor) {
        throw new TypeError(`Extension factor must be at ${minExtensionFactor}`);
    }
}