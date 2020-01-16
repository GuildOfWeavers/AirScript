// IMPORTS
// ================================================================================================
import { AirSchema } from '@guildofweavers/air-assembly';
import * as fs from 'fs';
import { lexer } from './lib/lexer';
import { parser } from './lib/parser';
import { visitor } from './lib/visitor';
import { AirScriptError } from './lib/errors';

// PUBLIC FUNCTIONS
// ================================================================================================
export function compile(sourceOrPath: string | Buffer, componentName?: string): AirSchema {
    
    // determine the source of the script
    let source: string;
    if (Buffer.isBuffer(sourceOrPath)) {
        source = sourceOrPath.toString('utf8');
    }
    else {
        if (typeof sourceOrPath !== 'string')
            throw new TypeError(`source path '${sourceOrPath}' is invalid`);

        try {
            source = fs.readFileSync(sourceOrPath, { encoding: 'utf8' });
        }
        catch (error) {
            throw new AirScriptError([error]);
        }
    }

    // tokenize input
    const lexResult = lexer.tokenize(source);
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
        const schema: AirSchema = visitor.visit(cst, componentName);
        return schema;
    }
    catch (error) {
        throw new AirScriptError([error]);
    }
}