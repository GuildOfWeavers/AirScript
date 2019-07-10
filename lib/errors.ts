// IMPORTS
// ================================================================================================
import { ILexerErrorMessageProvider, IToken, IParserErrorMessageProvider } from "chevrotain";

// MESSAGE PROVIDERS
// ================================================================================================
export const lexerErrorMessageProvider: ILexerErrorMessageProvider = {
    buildUnexpectedCharactersMessage(fullText, startOffset, length, line?, column?): string {
        const char = fullText.slice(startOffset, startOffset + length);
        return `Unexpected character '${char}' at [${line}, ${column}]`;
    },
    buildUnableToPopLexerModeMessage(token: IToken): string {
        return `Unable to pop lexer mode at [${token.startLine}, ${token.startColumn}]`;
    }
}

export const parserErrorMessageProvider: IParserErrorMessageProvider = {
    buildMismatchTokenMessage(options): string {
        const token = options.actual;
        return `Syntax error near '${token.image}' [${token.startLine}, ${token.startColumn}]`;
    },
    buildNoViableAltMessage(options): string {
        const token = options.actual[0];
        return `Syntax error near '${token.image}' [${token.startLine}, ${token.startColumn}]`;
    },
    buildEarlyExitMessage(options): string {
        const token = options.actual[0];
        return `Syntax error near '${token.image}' [${token.startLine}, ${token.startColumn}]`;
    }
};

// SCRIPT ERROR
// ================================================================================================
export class AirScriptError extends Error {

    readonly errors: any[];

    constructor(errors: any[]) {
        let message = `Failed to parse AIR script`;
        let prefix = '';
        if (errors.length === 1) {
            message += ': ';
        }
        else {
            message += `; ${errors.length} errors detected:`;
            prefix = '\n\t';
        }

        for (let error of errors) {
            message += `${prefix}${error.message}`;
        }

        super(message);
        this.errors = errors;
    }
}