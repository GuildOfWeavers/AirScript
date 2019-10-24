// IMPORTS
// ================================================================================================
import { WasmOptions } from '@guildofweavers/air-script';
import { lexer } from './lexer';
import { parser } from './parser';
import { visitor } from './visitor';
import { AirScriptError } from '../errors';
import { ModuleInfo } from './ModuleInfo';

// PUBLIC FUNCTIONS
// ================================================================================================
export function parse(source: Buffer, wasmOptions?: WasmOptions) {
    
    // tokenize input
    const lexResult = lexer.tokenize(source.toString('utf8'));
    if(lexResult.errors.length > 0) {
        throw new AirScriptError(lexResult.errors);
    }

    // apply grammar rules
    parser.input = lexResult.tokens;
    const cst = parser.module();
    if (parser.errors.length > 0) {
        throw new AirScriptError(parser.errors);
    }

    // build Assembly object
    try {
        const result: ModuleInfo = visitor.visit(cst, wasmOptions);
        return result;
    }
    catch (error) {
        throw new AirScriptError([error]);
    }
}