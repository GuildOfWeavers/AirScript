// IMPORTS
// ================================================================================================
import { AirSchema } from '@guildofweavers/air-assembly';
import * as fs from 'fs';
import * as path from 'path';
import { lexer } from './lib/lexer';
import { parser } from './lib/parser';
import { visitor } from './lib/visitor';
import { AirScriptError } from './lib/errors';

// PUBLIC FUNCTIONS
// ================================================================================================
export function compile(sourceOrPath: string | Buffer, componentName = 'default'): AirSchema {

    // determine the source of the script
    let source: string, basedir: string;
    if (Buffer.isBuffer(sourceOrPath)) {
        source = sourceOrPath.toString('utf8');
        basedir = getCallerDirectory()!;
    }
    else {
        if (typeof sourceOrPath !== 'string')
            throw new TypeError(`source path '${sourceOrPath}' is invalid`);

        try {
            if (!path.isAbsolute(sourceOrPath)) {
                sourceOrPath = path.resolve(getCallerDirectory(), sourceOrPath);
            }
            source = fs.readFileSync(sourceOrPath, { encoding: 'utf8' });
            basedir = path.dirname(sourceOrPath);
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
        const schema: AirSchema = visitor.visit(cst, { name: componentName, basedir });
        return schema;
    }
    catch (error) {
        throw new AirScriptError([error]);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function getCallerDirectory(): string {
    let callerFile: string | undefined;
    try {
        const origPrepareStackTrace = Error.prepareStackTrace
        Error.prepareStackTrace = function (err, stack) { return stack; };

        const err: any = new Error();
        let currentFile: string = err.stack.shift().getFileName();
        while (err.stack.length) {
            callerFile = err.stack.shift().getFileName();
            if (currentFile !== callerFile) break;
        }

        Error.prepareStackTrace = origPrepareStackTrace
    } catch (err) {
        throw new Error(`could not determine base directory for the script`);
    }

    if (!callerFile) {
        throw new Error(`could not determine base directory for the script`);
    }

    return path.dirname(callerFile);
}