"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const lexer_1 = require("./lib/lexer");
const parser_1 = require("./lib/parser");
const visitor_1 = require("./lib/visitor");
// PUBLIC FUNCTIONS
// ================================================================================================
function parseScript(text) {
    const lexResult = lexer_1.lexer.tokenize(text);
    // TODO: check lexer output for lexResult.errors
    parser_1.parser.input = lexResult.tokens;
    const cst = parser_1.parser.script();
    const errors = parser_1.parser.errors;
    if (errors.length > 0) {
        // TODO: put all errors into a custom class
        throw new Error(errors[0].toString());
    }
    const result = visitor_1.visitor.visit(cst);
    return result;
}
exports.parseScript = parseScript;
function parseStatementBlock(text) {
    const lexResult = lexer_1.lexer.tokenize(text);
    // TODO: check lexer output for lexResult.errors
    parser_1.parser.input = lexResult.tokens;
    const cst = parser_1.parser.statementBlock();
    const errors = parser_1.parser.errors;
    if (errors.length > 0) {
        // TODO: put all errors into a custom class
        throw new Error(errors[0].toString());
    }
    const cbc = new TFunctionContext();
    const result = visitor_1.visitor.visit(cst, cbc);
    return result;
}
exports.parseStatementBlock = parseStatementBlock;
class TFunctionContext {
    constructor() {
        this.variables = new Map();
    }
    setVariableDimensions(variable, dimensions) {
        // TODO: check dimensions
        this.variables.set(variable, dimensions);
    }
    getVariableDimensions(variable) {
        return this.variables.get(variable);
    }
    buildRegisterReference(register) {
        const name = register.slice(0, 2);
        const index = Number.parseInt(register.slice(2), 10);
        // TODO: check index ranges
        return `${name}[${index}]`;
    }
}
//# sourceMappingURL=index.js.map