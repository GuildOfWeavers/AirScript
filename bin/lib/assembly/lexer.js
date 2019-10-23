"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const chevrotain_1 = require("chevrotain");
const errors_1 = require("../errors");
// LITERALS AND IDENTIFIERS
// ================================================================================================
exports.Literal = chevrotain_1.createToken({ name: "Literal", pattern: /0|[1-9]\d*/ });
exports.Identifier = chevrotain_1.createToken({ name: "Identifier", pattern: /\$[a-zA-Z]\w*/ });
// KEYWORDS
// ================================================================================================
exports.Module = chevrotain_1.createToken({ name: "Module", pattern: /module/ });
exports.Field = chevrotain_1.createToken({ name: "Field", pattern: /field/ });
exports.Prime = chevrotain_1.createToken({ name: "Prime", pattern: /prime/ });
exports.Const = chevrotain_1.createToken({ name: "Const", pattern: /const/ });
exports.Fixed = chevrotain_1.createToken({ name: "Fixed", pattern: /fixed/ });
exports.Input = chevrotain_1.createToken({ name: "Input", pattern: /input/ });
exports.Local = chevrotain_1.createToken({ name: "Local", pattern: /local/ });
exports.Repeat = chevrotain_1.createToken({ name: "Repeat", pattern: /repeat/ });
exports.Spread = chevrotain_1.createToken({ name: "Spread", pattern: /spread/ });
exports.Binary = chevrotain_1.createToken({ name: "Binary", pattern: /binary/ });
exports.Secret = chevrotain_1.createToken({ name: "Secret", pattern: /secret/ });
exports.Public = chevrotain_1.createToken({ name: "Public", pattern: /public/ });
exports.Transition = chevrotain_1.createToken({ name: "Transition", pattern: /transition/ });
exports.Evaluation = chevrotain_1.createToken({ name: "Evaluation", pattern: /evaluation/ });
exports.Frame = chevrotain_1.createToken({ name: "Frame", pattern: /frame/ });
// TYPES
// ================================================================================================
exports.Scalar = chevrotain_1.createToken({ name: "Scalar", pattern: /scalar/ });
exports.Vector = chevrotain_1.createToken({ name: "Vector", pattern: /vector/ });
exports.Matrix = chevrotain_1.createToken({ name: "Matrix", pattern: /matrix/ });
// OPERATORS
// ================================================================================================
exports.Get = chevrotain_1.createToken({ name: "Get", pattern: /get/ });
exports.Slice = chevrotain_1.createToken({ name: "Slice", pattern: /slice/ });
exports.BinaryOp = chevrotain_1.createToken({ name: "BinaryOp", pattern: chevrotain_1.Lexer.NA });
exports.Add = chevrotain_1.createToken({ name: "Add", pattern: /add/, categories: exports.BinaryOp });
exports.Sub = chevrotain_1.createToken({ name: "Sub", pattern: /sub/, categories: exports.BinaryOp });
exports.Mul = chevrotain_1.createToken({ name: "Mul", pattern: /mul/, categories: exports.BinaryOp });
exports.Div = chevrotain_1.createToken({ name: "Div", pattern: /div/, categories: exports.BinaryOp });
exports.Exp = chevrotain_1.createToken({ name: "Exp", pattern: /exp/, categories: exports.BinaryOp });
exports.Prod = chevrotain_1.createToken({ name: "Prod", pattern: /prod/, categories: exports.BinaryOp });
exports.UnaryOp = chevrotain_1.createToken({ name: "UnaryOp", pattern: chevrotain_1.Lexer.NA });
exports.Neg = chevrotain_1.createToken({ name: "Neg", pattern: /neg/, categories: exports.UnaryOp });
exports.Inv = chevrotain_1.createToken({ name: "Inv", pattern: /inv/, categories: exports.UnaryOp });
exports.LoadOp = chevrotain_1.createToken({ name: "LoadOp", pattern: chevrotain_1.Lexer.NA });
exports.LoadConst = chevrotain_1.createToken({ name: "LoadConst", pattern: /load.const/, categories: exports.LoadOp });
exports.LoadTrace = chevrotain_1.createToken({ name: "LoadTrace", pattern: /load.trace/, categories: exports.LoadOp });
exports.LoadFixed = chevrotain_1.createToken({ name: "LoadFixed", pattern: /load.fixed/, categories: exports.LoadOp });
exports.LoadInput = chevrotain_1.createToken({ name: "LoadInput", pattern: /load.input/, categories: exports.LoadOp });
exports.LoadLocal = chevrotain_1.createToken({ name: "LoadLocal", pattern: /load.local/, categories: exports.LoadOp });
exports.SaveOp = chevrotain_1.createToken({ name: "SaveLocal", pattern: /save.local/ });
// SYMBOLS
// ================================================================================================
exports.LParen = chevrotain_1.createToken({ name: "LParen", pattern: /\(/ });
exports.RParen = chevrotain_1.createToken({ name: "RParen", pattern: /\)/ });
// WHITESPACE
// ================================================================================================
exports.WhiteSpace = chevrotain_1.createToken({ name: "WhiteSpace", pattern: /[ \t\n\r]+/, group: chevrotain_1.Lexer.SKIPPED });
// ALL TOKENS
// ================================================================================================
exports.allTokens = [
    exports.WhiteSpace,
    exports.Module, exports.Field, exports.Prime, exports.Const, exports.Fixed, exports.Input, exports.Local, exports.Repeat, exports.Spread, exports.Secret, exports.Public, exports.Binary,
    exports.Transition, exports.Evaluation, exports.Frame,
    exports.Scalar, exports.Vector, exports.Matrix,
    exports.Get, exports.Slice, exports.BinaryOp, exports.Add, exports.Sub, exports.Mul, exports.Div, exports.Exp, exports.Prod, exports.UnaryOp, exports.Neg, exports.Inv,
    exports.LoadOp, exports.LoadConst, exports.LoadTrace, exports.LoadFixed, exports.LoadInput, exports.LoadLocal, exports.SaveOp,
    exports.LParen, exports.RParen,
    exports.Literal, exports.Identifier
];
// EXPORT LEXER INSTANCE
// ================================================================================================
exports.lexer = new chevrotain_1.Lexer(exports.allTokens, { errorMessageProvider: errors_1.lexerErrorMessageProvider });
//# sourceMappingURL=lexer.js.map