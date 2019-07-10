"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// MESSAGE PROVIDERS
// ================================================================================================
exports.lexerErrorMessageProvider = {
    buildUnexpectedCharactersMessage(fullText, startOffset, length, line, column) {
        const char = fullText.slice(startOffset, startOffset + length);
        return `Unexpected character '${char}' at [${line}, ${column}]`;
    },
    buildUnableToPopLexerModeMessage(token) {
        return `Unable to pop lexer mode at [${token.startLine}, ${token.startColumn}]`;
    }
};
exports.parserErrorMessageProvider = {
    buildMismatchTokenMessage(options) {
        const token = options.actual;
        return `Syntax error near '${token.image}' [${token.startLine}, ${token.startColumn}]`;
    },
    buildNoViableAltMessage(options) {
        const token = options.actual[0];
        return `Syntax error near '${token.image}' [${token.startLine}, ${token.startColumn}]`;
    },
    buildEarlyExitMessage(options) {
        const token = options.actual[0];
        return `Syntax error near '${token.image}' [${token.startLine}, ${token.startColumn}]`;
    }
};
// SCRIPT ERROR
// ================================================================================================
class AirScriptError extends Error {
    constructor(errors) {
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
exports.AirScriptError = AirScriptError;
//# sourceMappingURL=errors.js.map