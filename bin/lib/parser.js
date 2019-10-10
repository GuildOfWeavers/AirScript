"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const chevrotain_1 = require("chevrotain");
const lexer_1 = require("./lexer");
const errors_1 = require("./errors");
// PARSER DEFINITION
// ================================================================================================
class AirParser extends chevrotain_1.CstParser {
    constructor() {
        super(lexer_1.allTokens, { errorMessageProvider: errors_1.parserErrorMessageProvider });
        // SCRIPT
        // --------------------------------------------------------------------------------------------
        this.script = this.RULE('script', () => {
            this.CONSUME(lexer_1.Define);
            this.CONSUME(lexer_1.Identifier, { LABEL: 'starkName' });
            this.CONSUME(lexer_1.Over);
            this.SUBRULE(this.fieldDeclaration, { LABEL: 'fieldDeclaration' });
            this.CONSUME(lexer_1.LCurly);
            this.MANY(() => {
                this.OR([
                    { ALT: () => {
                            this.SUBRULE(this.constantDeclaration, { LABEL: 'globalConstants' });
                        } },
                    { ALT: () => {
                            this.CONSUME(lexer_1.Transition);
                            this.SUBRULE1(this.literalExpression, { LABEL: 'mutableRegisterCount' });
                            this.CONSUME1(lexer_1.Registers);
                            this.SUBRULE(this.transitionFunction, { LABEL: 'transitionFunction' });
                        } },
                    { ALT: () => {
                            this.CONSUME(lexer_1.Enforce);
                            this.SUBRULE2(this.literalExpression, { LABEL: 'constraintCount' });
                            this.CONSUME(lexer_1.Constraints);
                            this.SUBRULE(this.transitionConstraints, { LABEL: 'transitionConstraints' });
                        } },
                    { ALT: () => {
                            this.CONSUME(lexer_1.Using);
                            this.SUBRULE3(this.literalExpression, { LABEL: 'readonlyRegisterCount' });
                            this.CONSUME(lexer_1.Readonly);
                            this.CONSUME2(lexer_1.Registers);
                            this.SUBRULE(this.readonlyRegisters, { LABEL: 'readonlyRegisters' });
                        } }
                ]);
            });
            this.CONSUME(lexer_1.RCurly);
        });
        // FINITE FIELD
        // --------------------------------------------------------------------------------------------
        this.fieldDeclaration = this.RULE('fieldDeclaration', () => {
            this.CONSUME(lexer_1.Prime);
            this.CONSUME(lexer_1.Field);
            this.CONSUME(lexer_1.LParen);
            this.SUBRULE(this.literalExpression, { LABEL: 'modulus' });
            this.CONSUME(lexer_1.RParen);
        });
        // GLOBAL CONSTANTS
        // --------------------------------------------------------------------------------------------
        this.constantDeclaration = this.RULE('constantDeclaration', () => {
            this.CONSUME(lexer_1.Identifier, { LABEL: 'constantName' });
            this.CONSUME(lexer_1.Colon);
            this.OR([
                { ALT: () => this.SUBRULE(this.literalExpression, { LABEL: 'value' }) },
                { ALT: () => this.SUBRULE(this.literalVector, { LABEL: 'vector' }) },
                { ALT: () => this.SUBRULE(this.literalMatrix, { LABEL: 'matrix' }) }
            ]);
            this.CONSUME(lexer_1.Semicolon);
        });
        this.literalVector = this.RULE('literalVector', () => {
            this.CONSUME(lexer_1.LSquare);
            this.AT_LEAST_ONE_SEP({
                SEP: lexer_1.Comma,
                DEF: () => this.SUBRULE(this.literalExpExpression, { LABEL: 'elements' })
            });
            this.CONSUME(lexer_1.RSquare);
        });
        this.literalMatrix = this.RULE('literalMatrix', () => {
            this.CONSUME(lexer_1.LSquare);
            this.AT_LEAST_ONE_SEP({
                SEP: lexer_1.Comma,
                DEF: () => this.SUBRULE(this.literalMatrixRow, { LABEL: 'rows' })
            });
            this.CONSUME(lexer_1.RSquare);
        });
        this.literalMatrixRow = this.RULE('literalMatrixRow', () => {
            this.CONSUME(lexer_1.LSquare);
            this.AT_LEAST_ONE_SEP({
                SEP: lexer_1.Comma,
                DEF: () => this.SUBRULE(this.literalExpression, { LABEL: 'elements' })
            });
            this.CONSUME(lexer_1.RSquare);
        });
        // READONLY REGISTERS
        // --------------------------------------------------------------------------------------------
        this.readonlyRegisters = this.RULE('readonlyRegisters', () => {
            this.CONSUME(lexer_1.LCurly);
            this.AT_LEAST_ONE(() => this.SUBRULE(this.readonlyRegisterDefinition, { LABEL: 'registers' }));
            this.CONSUME(lexer_1.RCurly);
        });
        this.readonlyRegisterDefinition = this.RULE('readonlyRegisterDefinition', () => {
            this.CONSUME1(lexer_1.ReadonlyRegister, { LABEL: 'name' });
            this.CONSUME(lexer_1.Colon);
            this.OR1([
                { ALT: () => this.CONSUME2(lexer_1.Repeat, { LABEL: 'pattern' }) },
                { ALT: () => this.CONSUME2(lexer_1.Spread, { LABEL: 'pattern' }) }
            ]);
            this.OPTION(() => this.CONSUME(lexer_1.Binary, { LABEL: 'binary' }));
            this.OR2([
                { ALT: () => {
                        this.CONSUME(lexer_1.LSquare);
                        this.CONSUME(lexer_1.Ellipsis);
                        this.CONSUME(lexer_1.RSquare);
                    } },
                { ALT: () => {
                        this.SUBRULE(this.literalVector, { LABEL: 'values' });
                    } }
            ]);
            this.CONSUME(lexer_1.Semicolon);
        });
        // TRANSITION FUNCTION AND CONSTRAINTS
        // --------------------------------------------------------------------------------------------
        this.transitionFunction = this.RULE('transitionFunction', () => {
            this.CONSUME(lexer_1.LCurly);
            this.SUBRULE(this.inputBlock, { LABEL: 'inputBlock' });
            this.CONSUME(lexer_1.RCurly);
        });
        this.transitionConstraints = this.RULE('transitionConstraints', () => {
            this.CONSUME(lexer_1.LCurly);
            this.OR([
                { ALT: () => {
                        this.SUBRULE(this.inputBlock, { LABEL: 'inputBlock' });
                    } },
                { ALT: () => {
                        this.CONSUME(lexer_1.For);
                        this.CONSUME(lexer_1.All);
                        this.CONSUME(lexer_1.Steps);
                        this.SUBRULE(this.statementBlock, { LABEL: 'allStepBlock' });
                    } }
            ]);
            this.CONSUME(lexer_1.RCurly);
        });
        // LOOPS
        // --------------------------------------------------------------------------------------------
        this.inputBlock = this.RULE('inputBlock', () => {
            this.CONSUME(lexer_1.For);
            this.CONSUME(lexer_1.Each);
            this.CONSUME(lexer_1.LParen);
            this.AT_LEAST_ONE_SEP({
                SEP: lexer_1.Comma,
                DEF: () => this.CONSUME(lexer_1.InitRegister, { LABEL: 'registers' })
            });
            this.CONSUME(lexer_1.RParen);
            this.CONSUME(lexer_1.LCurly);
            this.CONSUME(lexer_1.Init);
            this.OR1([
                { ALT: () => this.SUBRULE(this.statementBlock, { LABEL: 'initExpression' }) },
                { ALT: () => {
                        this.SUBRULE(this.expression, { LABEL: 'initExpression' });
                        this.CONSUME(lexer_1.Semicolon);
                    } }
            ]);
            this.OR2([
                { ALT: () => this.SUBRULE(this.inputBlock, { LABEL: 'inputBlock' }) },
                { ALT: () => {
                        this.AT_LEAST_ONE(() => {
                            this.SUBRULE(this.segmentLoop, { LABEL: 'segmentLoops' });
                        });
                    } }
            ]);
            this.CONSUME(lexer_1.RCurly);
        });
        this.segmentLoop = this.RULE('segmentLoop', () => {
            this.CONSUME(lexer_1.For);
            this.CONSUME(lexer_1.Steps);
            this.CONSUME(lexer_1.LSquare);
            this.AT_LEAST_ONE_SEP({
                SEP: lexer_1.Comma,
                DEF: () => this.SUBRULE(this.literalRangeExpression, { LABEL: 'ranges' })
            });
            this.CONSUME(lexer_1.RSquare);
            this.SUBRULE(this.statementBlock, { LABEL: 'statements' });
        });
        // STATEMENTS
        // --------------------------------------------------------------------------------------------
        this.statementBlock = this.RULE('statementBlock', () => {
            this.CONSUME(lexer_1.LCurly);
            this.MANY(() => {
                this.SUBRULE(this.statement, { LABEL: 'statements' });
            });
            this.SUBRULE1(this.assignableExpression, { LABEL: 'expression' });
            this.OPTION1(() => {
                this.CONSUME(lexer_1.Equals);
                this.SUBRULE2(this.expression, { LABEL: 'constraint' });
            });
            this.OPTION2(() => {
                this.CONSUME(lexer_1.Semicolon);
            });
            this.CONSUME(lexer_1.RCurly);
        });
        this.statement = this.RULE('statement', () => {
            this.CONSUME(lexer_1.Identifier, { LABEL: 'variableName' });
            this.CONSUME(lexer_1.AssignOp);
            this.SUBRULE(this.assignableExpression, { LABEL: 'expression' });
            this.CONSUME(lexer_1.Semicolon);
        });
        this.assignableExpression = this.RULE('assignableExpression', () => {
            this.OR([
                {
                    GATE: this.BACKTRACK(this.matrix),
                    ALT: () => this.SUBRULE(this.matrix, { LABEL: 'expression' })
                },
                {
                    GATE: this.BACKTRACK(this.whenExpression),
                    ALT: () => this.SUBRULE(this.whenExpression, { LABEL: 'expression' })
                },
                {
                    ALT: () => this.SUBRULE(this.expression, { LABEL: 'expression' })
                }
            ]);
        });
        // WHEN...ELSE EXPRESSION
        // --------------------------------------------------------------------------------------------
        this.whenExpression = this.RULE('whenExpression', () => {
            this.OR([
                { ALT: () => {
                        this.CONSUME(lexer_1.When);
                        this.SUBRULE1(this.whenCondition, { LABEL: 'condition' });
                        this.SUBRULE1(this.statementBlock, { LABEL: 'tExpression' });
                        this.CONSUME(lexer_1.Else);
                        this.SUBRULE2(this.statementBlock, { LABEL: 'fExpression' });
                    } },
                { ALT: () => {
                        this.SUBRULE2(this.whenCondition, { LABEL: 'condition' });
                        this.CONSUME(lexer_1.QMark);
                        this.SUBRULE1(this.expression, { LABEL: 'tExpression' });
                        this.CONSUME(lexer_1.Colon);
                        this.SUBRULE2(this.expression, { LABEL: 'fExpression' });
                    } }
            ]);
        });
        this.whenCondition = this.RULE('whenCondition', () => {
            this.OR([
                { ALT: () => {
                        this.CONSUME(lexer_1.LParen);
                        this.CONSUME1(lexer_1.RegisterRef, { LABEL: 'register' });
                        this.CONSUME(lexer_1.RParen);
                    } },
                { ALT: () => {
                        this.CONSUME2(lexer_1.RegisterRef, { LABEL: 'register' });
                    } }
            ]);
        });
        // TRANSITION CALL EXPRESSION
        // --------------------------------------------------------------------------------------------
        this.transitionCall = this.RULE('transitionCall', () => {
            this.CONSUME(lexer_1.Transition);
            this.CONSUME(lexer_1.LParen);
            this.CONSUME(lexer_1.RegisterBank, { LABEL: 'registers' });
            this.CONSUME(lexer_1.RParen);
        });
        // VECTORS AND MATRIXES
        // --------------------------------------------------------------------------------------------
        this.vector = this.RULE('vector', () => {
            this.CONSUME(lexer_1.LSquare);
            this.AT_LEAST_ONE_SEP({
                SEP: lexer_1.Comma,
                DEF: () => {
                    this.OR([
                        { ALT: () => this.SUBRULE(this.expression, { LABEL: 'elements' }) },
                        { ALT: () => this.SUBRULE(this.vectorDestructuring, { LABEL: 'elements' }) }
                    ]);
                }
            });
            this.CONSUME(lexer_1.RSquare);
        });
        this.vectorDestructuring = this.RULE('vectorDestructuring', () => {
            this.CONSUME(lexer_1.Ellipsis);
            this.SUBRULE(this.vectorExpression, { LABEL: 'vector' });
        });
        this.matrix = this.RULE('matrix', () => {
            this.CONSUME(lexer_1.LSquare);
            this.AT_LEAST_ONE_SEP({
                SEP: lexer_1.Comma,
                DEF: () => this.SUBRULE(this.matrixRow, { LABEL: 'rows' })
            });
            this.CONSUME(lexer_1.RSquare);
        });
        this.matrixRow = this.RULE('matrixRow', () => {
            this.CONSUME(lexer_1.LSquare);
            this.AT_LEAST_ONE_SEP({
                SEP: lexer_1.Comma,
                DEF: () => this.SUBRULE(this.expression, { LABEL: 'elements' })
            });
            this.CONSUME(lexer_1.RSquare);
        });
        // EXPRESSIONS
        // --------------------------------------------------------------------------------------------
        this.expression = this.RULE('expression', () => {
            this.SUBRULE1(this.mulExpression, { LABEL: 'lhs' });
            this.MANY(() => {
                this.CONSUME(lexer_1.AddOp);
                this.SUBRULE2(this.mulExpression, { LABEL: 'rhs' });
            });
        });
        this.mulExpression = this.RULE('mulExpression', () => {
            this.SUBRULE1(this.expExpression, { LABEL: 'lhs' });
            this.MANY(() => {
                this.CONSUME(lexer_1.MulOp);
                this.SUBRULE2(this.expExpression, { LABEL: 'rhs' });
            });
        });
        this.expExpression = this.RULE('expExpression', () => {
            this.SUBRULE1(this.vectorExpression, { LABEL: 'base' });
            this.MANY(() => {
                this.CONSUME(lexer_1.ExpOp);
                this.SUBRULE2(this.atomicExpression, { LABEL: 'exponent' });
            });
        });
        this.vectorExpression = this.RULE('vectorExpression', () => {
            this.SUBRULE(this.atomicExpression, { LABEL: 'expression' });
            this.OPTION(() => {
                this.CONSUME(lexer_1.LSquare);
                this.OR([
                    { ALT: () => {
                            this.CONSUME1(lexer_1.IntegerLiteral, { LABEL: 'rangeStart' });
                            this.CONSUME(lexer_1.DoubleDot);
                            this.CONSUME2(lexer_1.IntegerLiteral, { LABEL: 'rangeEnd' });
                        } },
                    { ALT: () => {
                            this.CONSUME3(lexer_1.IntegerLiteral, { LABEL: 'index' });
                        } }
                ]);
                this.CONSUME(lexer_1.RSquare);
            });
        });
        this.atomicExpression = this.RULE('atomicExpression', () => {
            this.OPTION(() => {
                this.OR1([
                    { ALT: () => this.CONSUME(lexer_1.Minus, { LABEL: 'neg' }) },
                    { ALT: () => this.CONSUME(lexer_1.Slash, { LABEL: 'inv' }) }
                ]);
            });
            this.OR2([
                { ALT: () => {
                        this.CONSUME(lexer_1.LParen);
                        this.SUBRULE(this.expression, { LABEL: 'expression' });
                        this.CONSUME(lexer_1.RParen);
                    } },
                { ALT: () => this.SUBRULE(this.vector, { LABEL: 'expression' }) },
                { ALT: () => this.SUBRULE(this.transitionCall, { LABEL: 'expression' }) },
                { ALT: () => this.CONSUME(lexer_1.Identifier, { LABEL: 'symbol' }) },
                { ALT: () => this.CONSUME(lexer_1.RegisterRef, { LABEL: 'symbol' }) },
                { ALT: () => this.CONSUME(lexer_1.RegisterBank, { LABEL: 'symbol' }) },
                { ALT: () => this.CONSUME(lexer_1.IntegerLiteral, { LABEL: 'literal' }) }
            ]);
        });
        // LITERAL EXPRESSIONS
        // --------------------------------------------------------------------------------------------
        this.literalExpression = this.RULE('literalExpression', () => {
            this.SUBRULE1(this.literalMulExpression, { LABEL: 'lhs' });
            this.MANY(() => {
                this.CONSUME(lexer_1.AddOp);
                this.SUBRULE2(this.literalMulExpression, { LABEL: 'rhs' });
            });
        });
        this.literalMulExpression = this.RULE('literalMulExpression', () => {
            this.SUBRULE1(this.literalExpExpression, { LABEL: 'lhs' });
            this.MANY(() => {
                this.CONSUME(lexer_1.MulOp);
                this.SUBRULE2(this.literalExpExpression, { LABEL: 'rhs' });
            });
        });
        this.literalExpExpression = this.RULE('literalExpExpression', () => {
            this.SUBRULE1(this.literalAtomicExpression, { LABEL: 'base' });
            this.MANY(() => {
                this.CONSUME(lexer_1.ExpOp);
                this.SUBRULE2(this.literalAtomicExpression, { LABEL: 'exponent' });
            });
        });
        this.literalAtomicExpression = this.RULE('literalAtomicExpression', () => {
            this.OPTION(() => {
                this.OR1([
                    { ALT: () => this.CONSUME(lexer_1.Minus, { LABEL: 'neg' }) },
                    { ALT: () => this.CONSUME(lexer_1.Slash, { LABEL: 'inv' }) }
                ]);
            });
            this.OR2([
                { ALT: () => {
                        this.CONSUME(lexer_1.LParen);
                        this.SUBRULE(this.literalExpression, { LABEL: 'expression' });
                        this.CONSUME(lexer_1.RParen);
                    } },
                { ALT: () => {
                        this.CONSUME(lexer_1.IntegerLiteral, { LABEL: 'literal' });
                    } }
            ]);
        });
        this.literalRangeExpression = this.RULE('literalRangeExpression', () => {
            this.CONSUME1(lexer_1.IntegerLiteral, { LABEL: 'start' });
            this.OPTION(() => {
                this.CONSUME(lexer_1.DoubleDot);
                this.CONSUME2(lexer_1.IntegerLiteral, { LABEL: 'end' });
            });
        });
        this.performSelfAnalysis();
    }
}
// EXPORT PARSER INSTANCE
// ================================================================================================
exports.parser = new AirParser();
//# sourceMappingURL=parser.js.map