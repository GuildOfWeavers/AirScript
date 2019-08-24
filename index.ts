// IMPORTS
// ================================================================================================
import { StarkLimits, WasmOptions } from '@guildofweavers/air-script';
import { lexer } from './lib/lexer';
import { parser } from './lib/parser';
import { visitor } from './lib/visitor';
import { AirObject, AirConfig } from './lib/AirObject';
import { AirScriptError } from './lib/errors';

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
export function parseScript(script: string, limits?: Partial<StarkLimits>, wasmOptions?: Partial<WasmOptions> | boolean): AirObject {
    // apply defaults
    limits = {...DEFAULT_LIMITS, ...limits };

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
        const airConfig: AirConfig = visitor.visit(cst, { limits, wasmOptions });
        const air = new AirObject(airConfig);
        //validateExtensionFactor(air.extensionFactor, air.maxConstraintDegree, limits.maxExtensionFactor!);
        return air;
    }
    catch (error) {
        throw new AirScriptError([error]);
    }
}