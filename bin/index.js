"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lexer_1 = require("./lib/lexer");
const parser_1 = require("./lib/parser");
const visitor_1 = require("./lib/visitor");
// PUBLIC FUNCTIONS
// ================================================================================================
function parseScript(text, limits) {
    const lexResult = lexer_1.lexer.tokenize(text);
    // TODO: check lexer output for lexResult.errors
    parser_1.parser.input = lexResult.tokens;
    const cst = parser_1.parser.script();
    const errors = parser_1.parser.errors;
    if (errors.length > 0) {
        // TODO: put all errors into a custom class
        throw new Error(errors[0].toString());
    }
    const result = visitor_1.visitor.visit(cst, limits);
    return result;
}
exports.parseScript = parseScript;
//# sourceMappingURL=index.js.map