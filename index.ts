// IMPORTS
// ================================================================================================
import { lexer } from './lib/lexer';
import { parser } from './lib/parser';
import { visitor } from './lib/visitor';
import { StatementBlockContext, Dimensions } from './lib/utils';

// PUBLIC FUNCTIONS
// ================================================================================================
export function parseScript(text: string) {
    const lexResult = lexer.tokenize(text);
    // TODO: check lexer output for lexResult.errors

    parser.input = lexResult.tokens;
    const cst = parser.script();

    const errors = parser.errors;
    if (errors.length > 0) {
        // TODO: put all errors into a custom class
        throw new Error(errors[0].toString());
    }

    const result = visitor.visit(cst);
    return result;
}

export function parseStatementBlock(text: string) {
    const lexResult = lexer.tokenize(text);
    // TODO: check lexer output for lexResult.errors

    parser.input = lexResult.tokens;
    const cst = parser.statementBlock();
    
    const errors = parser.errors;
    if (errors.length > 0) {
        // TODO: put all errors into a custom class
        throw new Error(errors[0].toString());
    }

    const cbc = new TFunctionContext();
    const result = visitor.visit(cst, cbc);
    return result;
}

class TFunctionContext implements StatementBlockContext {

    readonly variables: Map<string,Dimensions>;

    constructor() {
        this.variables = new Map();
    }

    setVariableDimensions(variable: string, dimensions: Dimensions) {
        // TODO: check dimensions
        this.variables.set(variable, dimensions);
    }

    getVariableDimensions(variable: string): Dimensions | undefined {
        return this.variables.get(variable);
    }

    buildRegisterReference(register: string): string {
        const name = register.slice(0, 2);
        const index = Number.parseInt(register.slice(2), 10);
        // TODO: check index ranges
        return `${name}[${index}]`;
    }
}