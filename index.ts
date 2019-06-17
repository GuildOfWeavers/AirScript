// IMPORTS
// ================================================================================================
import { StarkLimits, StarkConfig } from '@guildofweavers/air-script';
import { lexer } from './lib/lexer';
import { parser } from './lib/parser';
import { visitor } from './lib/visitor';
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
export function parseScript(text: string, limits?: Partial<StarkLimits>): StarkConfig {
    // apply defaults
    limits = {...DEFAULT_LIMITS, ...limits};

    // tokenize input
    const lexResult = lexer.tokenize(text);
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
        const result = visitor.visit(cst, limits);
        return result;
    }
    catch (error) {
        throw new AirScriptError([error]);
    }
}