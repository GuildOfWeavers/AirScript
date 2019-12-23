// IMPORTS
// ================================================================================================
import { AirModule, StarkLimits, ScriptOptions, WasmOptions } from '@guildofweavers/air-script';
import { promises as fs } from 'fs';
import { lexer } from './lib/lexer';
import { parser } from './lib/parser';
import { visitor } from './lib/visitor';
import { AirScriptError } from './lib/errors';
import { ScriptSpecs } from './lib/ScriptSpecs';
import * as generators from './lib/generators';
import { isPowerOf2 } from './lib/utils';
import { AirSchema } from '@guildofweavers/air-assembly';

// MODULE VARIABLES
// ================================================================================================
const DEFAULT_LIMITS: StarkLimits = {
    maxTraceLength      : 2**20,
    maxInputRegisters   : 32,
    maxStateRegisters   : 64,
    maxStaticRegisters  : 64,
    maxConstraintCount  : 1024,
    maxConstraintDegree : 16
};

// PUBLIC FUNCTIONS
// ================================================================================================
export async function instantiate(scriptOrPath: Buffer | string, options: ScriptOptions = {}): Promise<AirModule> {

    let script: string;
    if (Buffer.isBuffer(scriptOrPath)) {
        script = scriptOrPath.toString('utf8');
    }
    else {
        if (typeof scriptOrPath !== 'string') {
            throw new TypeError(`script path '${scriptOrPath}' is invalid`);
        }

        try {
            script = await fs.readFile(scriptOrPath, { encoding: 'utf8' });
        }
        catch (error) {
            throw new AirScriptError([error]);
        }
    }

    // apply default limits
    const limits = {...DEFAULT_LIMITS, ...options.limits };
    const wasmOptions = options.wasmOptions;

    // build AIR module
    try {
        const specs = parseScript(script, limits, wasmOptions);
        const extensionFactor = validateExtensionFactor(specs.maxTransitionConstraintDegree, options.extensionFactor);
        const air = generators.instantiateJsModule(specs, limits, extensionFactor);
        return air;
    }
    catch (error) {
        throw new AirScriptError([error]);
    }
}

export function compile(script: string) {
    
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
        const schema: AirSchema = visitor.visit(cst);
        return schema;
    }
    catch (error) {
        throw new AirScriptError([error]);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function parseScript(script: string, limits: StarkLimits, wasmOptions?: Partial<WasmOptions> | boolean): ScriptSpecs {

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

    // build and return script specs
    return visitor.visit(cst, { limits, wasmOptions });
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