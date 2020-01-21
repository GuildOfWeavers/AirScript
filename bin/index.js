"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const lexer_1 = require("./lib/lexer");
const parser_1 = require("./lib/parser");
const visitor_1 = require("./lib/visitor");
const errors_1 = require("./lib/errors");
// PUBLIC FUNCTIONS
// ================================================================================================
function compile(sourceOrPath, componentName) {
    // determine the source of the script
    let source;
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
        const schema = visitor_1.visitor.visit(cst, componentName);
        return schema;
    }
    catch (error) {
        throw new errors_1.AirScriptError([error]);
    }
}
exports.compile = compile;
//# sourceMappingURL=index.js.map