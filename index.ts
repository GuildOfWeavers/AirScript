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
    maxSteps                : 2**20,
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
        const air = generators.generateJsModule(specs, extensionFactor);
        return air;
    }
    catch (error) {
        throw new AirScriptError([error]);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function validateExtensionFactor(maxConstraintDegree: number, extensionFactor?: number): number {
    if (extensionFactor === undefined) {
        extensionFactor = 2**Math.ceil(Math.log2(maxConstraintDegree)) * 2;
        if (extensionFactor * 2 < maxConstraintDegree) {
            extensionFactor = extensionFactor * 2;
        }
    }
    else {
        if (!Number.isInteger(extensionFactor)) throw new TypeError('extension factor must be an integer');
        if (!isPowerOf2(extensionFactor)) throw new Error('extension factor must be a power of 2');
    }

    if (extensionFactor < maxConstraintDegree) {
        throw new Error(`extension factor must be greater than max constraint degree`);
    }

    return extensionFactor;
}