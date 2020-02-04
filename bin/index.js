"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const lexer_1 = require("./lib/lexer");
const parser_1 = require("./lib/parser");
const visitor_1 = require("./lib/visitor");
const errors_1 = require("./lib/errors");
// PUBLIC FUNCTIONS
// ================================================================================================
function compile(sourceOrPath, componentName = 'default') {
    // determine the source of the script
    let source, basedir;
    if (Buffer.isBuffer(sourceOrPath)) {
        source = sourceOrPath.toString('utf8');
        basedir = getCallerDirectory();
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
            throw new errors_1.AirScriptError([error]);
        }
    }
    // tokenize input
    const lexResult = lexer_1.lexer.tokenize(source);
    if (lexResult.errors.length > 0) {
        throw new errors_1.AirScriptError(lexResult.errors);
    }
    // apply grammar rules
    parser_1.parser.input = lexResult.tokens;
    const cst = parser_1.parser.script();
    if (parser_1.parser.errors.length > 0) {
        throw new errors_1.AirScriptError(parser_1.parser.errors);
    }
    // build AIR module
    try {
        const schema = visitor_1.visitor.visit(cst, { name: componentName, basedir });
        return schema;
    }
    catch (error) {
        throw new errors_1.AirScriptError([error]);
    }
}
exports.compile = compile;
// HELPER FUNCTIONS
// ================================================================================================
function getCallerDirectory() {
    let callerFile;
    try {
        const origPrepareStackTrace = Error.prepareStackTrace;
        Error.prepareStackTrace = function (err, stack) { return stack; };
        const err = new Error();
        let currentFile = err.stack.shift().getFileName();
        while (err.stack.length) {
            callerFile = err.stack.shift().getFileName();
            if (currentFile !== callerFile)
                break;
        }
        Error.prepareStackTrace = origPrepareStackTrace;
    }
    catch (err) {
        throw new Error(`could not determine base directory for the script`);
    }
    if (!callerFile) {
        throw new Error(`could not determine base directory for the script`);
    }
    return path.dirname(callerFile);
}
//# sourceMappingURL=index.js.map