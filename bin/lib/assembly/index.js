"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lexer_1 = require("./lexer");
const parser_1 = require("./parser");
const visitor_1 = require("./visitor");
const errors_1 = require("../errors");
// PUBLIC FUNCTIONS
// ================================================================================================
function parse(source, wasmOptions) {
    // tokenize input
    const lexResult = lexer_1.lexer.tokenize(source.toString('utf8'));
    if (lexResult.errors.length > 0) {
        throw new errors_1.AirScriptError(lexResult.errors);
    }
    // apply grammar rules
    parser_1.parser.input = lexResult.tokens;
    const cst = parser_1.parser.module();
    if (parser_1.parser.errors.length > 0) {
        throw new errors_1.AirScriptError(parser_1.parser.errors);
    }
    // build Assembly object
    try {
        const result = visitor_1.visitor.visit(cst, wasmOptions);
        return result;
    }
    catch (error) {
        throw new errors_1.AirScriptError([error]);
    }
}
exports.parse = parse;
//# sourceMappingURL=index.js.map