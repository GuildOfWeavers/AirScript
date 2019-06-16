// IMPORTS
// ================================================================================================
import { StarkLimits } from '@guildofweavers/air-script';
import { lexer } from './lib/lexer';
import { parser } from './lib/parser';
import { visitor } from './lib/visitor';

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