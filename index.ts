// IMPORTS
// ================================================================================================
import { StarkLimits } from '@guildofweavers/air-script';
import { lexer } from './lib/lexer';
import { parser } from './lib/parser';
import { visitor } from './lib/visitor';
import { StatementBlockContext } from './lib/StatementBlockContext';
import { Dimensions } from './lib/utils';

// PUBLIC FUNCTIONS
// ================================================================================================
export function parseScript(text: string, limits: StarkLimits) {
    const lexResult = lexer.tokenize(text);
    // TODO: check lexer output for lexResult.errors

    parser.input = lexResult.tokens;
    const cst = parser.script();

    const errors = parser.errors;
    if (errors.length > 0) {
        // TODO: put all errors into a custom class
        throw new Error(errors[0].toString());
    }

    const result = visitor.visit(cst, limits);
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

    const globals = new Map<string, Dimensions>();
    const cbc = new StatementBlockContext(globals, 4, 8, true);
    const result = visitor.visit(cst, cbc);
    return result;
}