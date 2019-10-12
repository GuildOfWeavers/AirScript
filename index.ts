// IMPORTS
// ================================================================================================
import { AirModule, StarkLimits, ScriptOptions } from '@guildofweavers/air-script';
import { lexer } from './lib/lexer';
import { parser } from './lib/parser';
import { visitor } from './lib/visitor';
import { AirScriptError } from './lib/errors';
import { ScriptSpecs } from './lib/ScriptSpecs';
import * as generators from './lib/generators';
import { isPowerOf2 } from './lib/utils';

// MODULE VARIABLES
// ================================================================================================
const DEFAULT_LIMITS: StarkLimits = {
    maxTraceLength          : 2**20,
    maxMutableRegisters     : 64,
    maxReadonlyRegisters    : 64,
    maxConstraintCount      : 1024,
    maxConstraintDegree     : 16
};

// PUBLIC FUNCTIONS
// ================================================================================================
export function parseScript(script: string, options: ScriptOptions = {}): AirModule {
    // apply default limits
    const limits = {...DEFAULT_LIMITS, ...options.limits };
    const wasmOptions = options.wasmOptions;

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

    // build AIR module
    try {
        const specs: ScriptSpecs = visitor.visit(cst, { limits, wasmOptions });
        const extensionFactor = validateExtensionFactor(specs.maxTransitionConstraintDegree, options.extensionFactor);
        const air = generators.generateJsModule(specs, limits, extensionFactor);
        return air;
    }
    catch (error) {
        throw new AirScriptError([error]);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function validateExtensionFactor(constraintDegree: number, extensionFactor?: number): number {
    const minExtensionFactor = 2**Math.ceil(Math.log2(constraintDegree)) * 2;

    if (extensionFactor === undefined) {
        extensionFactor = minExtensionFactor;
        if (extensionFactor * 2 < constraintDegree) {
            extensionFactor = extensionFactor * 2;
        }
    }
    else {
        if (!Number.isInteger(extensionFactor)) throw new TypeError('extension factor must be an integer');
        if (!isPowerOf2(extensionFactor)) throw new Error('extension factor must be a power of 2');
        if (extensionFactor < minExtensionFactor) {
            throw new Error(`extension factor cannot be smaller than ${minExtensionFactor}`);
        }
    }

    return extensionFactor;
}