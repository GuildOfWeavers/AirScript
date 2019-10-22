"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const chevrotain_1 = require("chevrotain");
const lexer_1 = require("./lexer");
const errors_1 = require("../errors");
// PARSER DEFINITION
// ================================================================================================
class AirParser extends chevrotain_1.CstParser {
    constructor() {
        super(lexer_1.allTokens, { errorMessageProvider: errors_1.parserErrorMessageProvider });
        // MODULE
        // --------------------------------------------------------------------------------------------
        this.module = this.RULE('module', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Module);
            this.SUBRULE(this.fieldDeclaration, { LABEL: 'field' });
            this.MANY(() => this.OR([
                { ALT: () => this.SUBRULE(this.constantDeclaration, { LABEL: 'constants' }) },
                { ALT: () => this.SUBRULE(this.staticRegister, { LABEL: 'staticRegisters' }) },
                { ALT: () => this.SUBRULE(this.transitionFunction, { LABEL: 'transitionFunction' }) },
                { ALT: () => this.SUBRULE(this.transitionConstraints, { LABEL: 'transitionConstraints' }) },
            ]));
            this.CONSUME(lexer_1.RParen);
        });
        // FINITE FIELD
        // --------------------------------------------------------------------------------------------
        this.fieldDeclaration = this.RULE('fieldDeclaration', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Field);
            this.CONSUME(lexer_1.Prime);
            this.CONSUME(lexer_1.Literal, { LABEL: 'modulus' });
            this.CONSUME(lexer_1.RParen);
        });
        // GLOBAL CONSTANTS
        // --------------------------------------------------------------------------------------------
        this.constantDeclaration = this.RULE('constantDeclaration', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Const);
            this.OR([
                { ALT: () => this.CONSUME(lexer_1.Literal, { LABEL: 'value' }) },
                { ALT: () => this.SUBRULE(this.literalVector, { LABEL: 'vector' }) },
                { ALT: () => this.SUBRULE(this.literalMatrix, { LABEL: 'matrix' }) }
            ]);
            this.CONSUME(lexer_1.RParen);
        });
        this.literalVector = this.RULE('literalVector', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Vector);
            this.AT_LEAST_ONE(() => this.CONSUME(lexer_1.Literal, { LABEL: 'elements' }));
            this.CONSUME(lexer_1.RParen);
        });
        this.literalMatrix = this.RULE('literalMatrix', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Matrix);
            this.AT_LEAST_ONE(() => {
                this.SUBRULE(this.literalMatrixRow, { LABEL: 'rows' });
            });
            this.CONSUME(lexer_1.RParen);
        });
        this.literalMatrixRow = this.RULE('literalMatrixRow', () => {
            this.CONSUME(lexer_1.LParen);
            this.AT_LEAST_ONE(() => this.CONSUME(lexer_1.Literal, { LABEL: 'elements' }));
            this.CONSUME(lexer_1.RParen);
        });
        // READONLY REGISTERS
        // --------------------------------------------------------------------------------------------
        this.staticRegister = this.RULE('staticRegister', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Fixed);
            this.OR([
                { ALT: () => this.CONSUME(lexer_1.Repeat, { LABEL: 'pattern' }) },
                { ALT: () => this.CONSUME(lexer_1.Spread, { LABEL: 'pattern' }) }
            ]);
            this.OPTION(() => this.CONSUME(lexer_1.Binary, { LABEL: 'binary' }));
            this.AT_LEAST_ONE(() => this.CONSUME(lexer_1.Literal, { LABEL: 'values' }));
            this.CONSUME(lexer_1.RParen);
        });
        // TRANSITION FUNCTION AND CONSTRAINTS
        // --------------------------------------------------------------------------------------------
        this.transitionFunction = this.RULE('transitionFunction', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Transition);
            this.SUBRULE(this.executionFrame, { LABEL: 'frame' });
            this.MANY(() => this.SUBRULE(this.localDeclaration, { LABEL: 'locals' }));
            this.AT_LEAST_ONE(() => this.SUBRULE(this.expression, { LABEL: 'body' }));
            this.CONSUME(lexer_1.RParen);
        });
        this.transitionConstraints = this.RULE('transitionConstraints', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Evaluation);
            this.SUBRULE(this.executionFrame, { LABEL: 'frame' });
            this.MANY(() => this.SUBRULE(this.localDeclaration, { LABEL: 'locals' }));
            this.AT_LEAST_ONE(() => this.SUBRULE(this.expression, { LABEL: 'body' }));
            this.CONSUME(lexer_1.RParen);
        });
        this.executionFrame = this.RULE('executionFrame', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Frame);
            this.CONSUME1(lexer_1.Literal, { LABEL: 'width' });
            this.CONSUME2(lexer_1.Literal, { LABEL: 'height' });
            this.CONSUME(lexer_1.RParen);
        });
        this.localDeclaration = this.RULE('localDeclaration', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Local);
            this.OR([
                { ALT: () => this.CONSUME(lexer_1.Scalar, { LABEL: 'type' }) },
                { ALT: () => this.CONSUME(lexer_1.Vector, { LABEL: 'type' }) },
                { ALT: () => this.CONSUME(lexer_1.Matrix, { LABEL: 'type' }) }
            ]);
            this.OPTION1(() => this.CONSUME1(lexer_1.Literal, { LABEL: 'rowCount' }));
            this.OPTION2(() => this.CONSUME2(lexer_1.Literal, { LABEL: 'colCount' }));
            this.CONSUME(lexer_1.RParen);
        });
        // EXPRESSIONS
        // --------------------------------------------------------------------------------------------
        this.expression = this.RULE('expression', () => {
            this.OR([
                { ALT: () => this.SUBRULE(this.binaryOperation, { LABEL: 'content' }) },
                { ALT: () => this.SUBRULE(this.unaryExpression, { LABEL: 'content' }) },
                { ALT: () => this.SUBRULE(this.vectorExpression, { LABEL: 'content' }) },
                { ALT: () => this.SUBRULE(this.extractExpression, { LABEL: 'content' }) },
                { ALT: () => this.SUBRULE(this.sliceExpression, { LABEL: 'content' }) },
                { ALT: () => this.SUBRULE(this.matrixExpression, { LABEL: 'content' }) },
                { ALT: () => this.SUBRULE(this.loadExpression, { LABEL: 'content' }) },
                { ALT: () => this.SUBRULE(this.saveExpression, { LABEL: 'content' }) },
                { ALT: () => this.CONSUME(lexer_1.Literal, { LABEL: 'value' }) }
            ]);
        });
        this.binaryOperation = this.RULE('binaryOperation', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.BinaryOp, { LABEL: 'operation' });
            this.SUBRULE1(this.expression, { LABEL: 'lhs' });
            this.SUBRULE2(this.expression, { LABEL: 'rhs' });
            this.CONSUME(lexer_1.RParen);
        });
        this.unaryExpression = this.RULE('unaryExpression', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.UnaryOp, { LABEL: 'operation' });
            this.SUBRULE(this.expression, { LABEL: 'operand' });
            this.CONSUME(lexer_1.RParen);
        });
        // VECTORS AND MATRIXES
        // --------------------------------------------------------------------------------------------
        this.vectorExpression = this.RULE('vectorExpression', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Vector);
            this.AT_LEAST_ONE(() => this.SUBRULE(this.expression, { LABEL: 'elements' }));
            this.CONSUME(lexer_1.RParen);
        });
        this.extractExpression = this.RULE('extractExpression', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Get);
            this.SUBRULE(this.expression, { LABEL: 'source' });
            this.CONSUME(lexer_1.Literal, { LABEL: 'index' });
            this.CONSUME(lexer_1.RParen);
        });
        this.sliceExpression = this.RULE('sliceExpression', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Slice);
            this.SUBRULE(this.expression, { LABEL: 'source' });
            this.CONSUME1(lexer_1.Literal, { LABEL: 'start' });
            this.CONSUME2(lexer_1.Literal, { LABEL: 'end' });
            this.CONSUME(lexer_1.RParen);
        });
        this.matrixExpression = this.RULE('matrixExpression', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.Matrix);
            this.AT_LEAST_ONE(() => this.SUBRULE(this.matrixRow, { LABEL: 'rows' }));
            this.CONSUME(lexer_1.RParen);
        });
        this.matrixRow = this.RULE('matrixRow', () => {
            this.CONSUME(lexer_1.LParen);
            this.AT_LEAST_ONE(() => this.SUBRULE(this.expression, { LABEL: 'elements' }));
            this.CONSUME(lexer_1.RParen);
        });
        // LOAD AND SAVE OPERATIONS
        // --------------------------------------------------------------------------------------------
        this.loadExpression = this.RULE('loadExpression', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.LoadOp, { LABEL: 'operation' });
            this.CONSUME(lexer_1.Literal, { LABEL: 'index' });
            this.CONSUME(lexer_1.RParen);
        });
        this.saveExpression = this.RULE('saveExpression', () => {
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.SaveOp, { LABEL: 'operation' });
            this.CONSUME(lexer_1.Literal, { LABEL: 'index' });
            this.CONSUME(lexer_1.RParen);
        });
        this.performSelfAnalysis();
    }
}
// EXPORT PARSER INSTANCE
// ================================================================================================
exports.parser = new AirParser();
//# sourceMappingURL=parser.js.map