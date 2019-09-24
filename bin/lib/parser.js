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
        this.script = this.RULE('script', () => {
            this.CONSUME(lexer_1.Define);
            this.CONSUME(lexer_1.Identifier, { LABEL: 'starkName' });
            this.CONSUME(lexer_1.Over);
            this.SUBRULE(this.fieldDeclaration, { LABEL: 'fieldDeclaration' });
            this.CONSUME(lexer_1.LCurly);
            this.MANY(() => {
                this.OR([
                    { ALT: () => {
                            this.SUBRULE(this.constantDeclaration, { LABEL: 'staticConstants' });
                        } },
                    { ALT: () => {
                            this.CONSUME(lexer_1.Transition);
                            this.SUBRULE2(this.literalExpression, { LABEL: 'mutableRegisterCount' });
                            this.CONSUME1(lexer_1.Registers);
                            this.CONSUME(lexer_1.In);
                            this.SUBRULE3(this.literalExpression, { LABEL: 'steps' });
                            this.CONSUME(lexer_1.Steps);
                            this.SUBRULE(this.transitionFunction, { LABEL: 'transitionFunction' });
                        } },
                    { ALT: () => {
                            this.CONSUME(lexer_1.Enforce);
                            this.SUBRULE4(this.literalExpression, { LABEL: 'constraintCount' });
                            this.CONSUME(lexer_1.Constraints);
                            this.SUBRULE(this.transitionConstraints, { LABEL: 'transitionConstraints' });
                        } },
                    { ALT: () => {
                            this.CONSUME(lexer_1.Using);
                            this.SUBRULE6(this.literalExpression, { LABEL: 'readonlyRegisterCount' });
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
        // STATIC CONSTANTS
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
            this.AT_LEAST_ONE(() => {
                this.OR([
                    { ALT: () => {
                            this.SUBRULE(this.staticRegisterDefinition, { LABEL: 'staticRegisters' });
                        } },
                    { ALT: () => {
                            this.SUBRULE(this.secretRegisterDefinition, { LABEL: 'secretRegisters' });
                        } },
                    { ALT: () => {
                            this.SUBRULE(this.publicRegisterDefinition, { LABEL: 'publicRegisters' });
                        } }
                ]);
            });
            this.CONSUME(lexer_1.RCurly);
        });
        this.staticRegisterDefinition = this.RULE('staticRegisterDefinition', () => {
            this.CONSUME1(lexer_1.StaticRegister, { LABEL: 'name' });
            this.CONSUME(lexer_1.Colon);
            this.OR([
                { ALT: () => { this.CONSUME2(lexer_1.Repeat, { LABEL: 'pattern' }); } },
                { ALT: () => { this.CONSUME2(lexer_1.Spread, { LABEL: 'pattern' }); } }
            ]);
            this.OPTION(() => {
                this.CONSUME(lexer_1.Binary, { LABEL: 'binary' });
            });
            this.SUBRULE(this.literalVector, { LABEL: 'values' });
            this.CONSUME(lexer_1.Semicolon);
        });
        this.secretRegisterDefinition = this.RULE('secretRegisterDefinition', () => {
            this.CONSUME1(lexer_1.SecretRegister, { LABEL: 'name' });
            this.CONSUME(lexer_1.Colon);
            this.OR([
                { ALT: () => { this.CONSUME2(lexer_1.Repeat, { LABEL: 'pattern' }); } },
                { ALT: () => { this.CONSUME2(lexer_1.Spread, { LABEL: 'pattern' }); } }
            ]);
            this.OPTION(() => {
                this.CONSUME(lexer_1.Binary, { LABEL: 'binary' });
            });
            this.CONSUME(lexer_1.LSquare);
            this.CONSUME(lexer_1.Ellipsis);
            this.CONSUME(lexer_1.RSquare);
            this.CONSUME(lexer_1.Semicolon);
        });
        this.publicRegisterDefinition = this.RULE('publicRegisterDefinition', () => {
            this.CONSUME1(lexer_1.PublicRegister, { LABEL: 'name' });
            this.CONSUME(lexer_1.Colon);
            this.OR([
                { ALT: () => { this.CONSUME2(lexer_1.Repeat, { LABEL: 'pattern' }); } },
                { ALT: () => { this.CONSUME2(lexer_1.Spread, { LABEL: 'pattern' }); } }
            ]);
            this.OPTION(() => {
                this.CONSUME(lexer_1.Binary, { LABEL: 'binary' });
            });
            this.CONSUME(lexer_1.LSquare);
            this.CONSUME(lexer_1.Ellipsis);
            this.CONSUME(lexer_1.RSquare);
            this.CONSUME(lexer_1.Semicolon);
        });
        // TRANSITION FUNCTION AND CONSTRAINTS
        // --------------------------------------------------------------------------------------------
        this.transitionFunction = this.RULE('transitionFunction', () => {
            this.CONSUME(lexer_1.LCurly);
            this.SUBRULE(this.statementBlock, { LABEL: 'statements' });
            this.CONSUME(lexer_1.RCurly);
        });
        this.transitionConstraints = this.RULE('transitionConstraints', () => {
            this.CONSUME(lexer_1.LCurly);
            this.SUBRULE(this.statementBlock, { LABEL: 'statements' });
            this.CONSUME(lexer_1.RCurly);
        });
        // STATEMENTS
        // --------------------------------------------------------------------------------------------
        this.statementBlock = this.RULE('statementBlock', () => {
            this.MANY(() => {
                this.SUBRULE(this.statement, { LABEL: 'statements' });
            });
            this.SUBRULE(this.expression, { LABEL: 'expression' });
            this.OPTION(() => {
                this.CONSUME(lexer_1.Semicolon);
            });
        });
        this.statement = this.RULE('statement', () => {
            this.CONSUME(lexer_1.Identifier, { LABEL: 'variableName' });
            this.CONSUME(lexer_1.AssignOp);
            this.OR([
                {
                    GATE: this.BACKTRACK(this.matrix),
                    ALT: () => this.SUBRULE(this.matrix, { LABEL: 'expression' })
                },
                {
                    GATE: this.BACKTRACK(this.expression),
                    ALT: () => this.SUBRULE(this.expression, { LABEL: 'expression' })
                }
            ]);
            this.CONSUME(lexer_1.Semicolon);
        });
        // WHEN...ELSE EXPRESSION
        // --------------------------------------------------------------------------------------------
        this.whenExpression = this.RULE('whenExpression', () => {
            this.CONSUME(lexer_1.When);
            this.CONSUME(lexer_1.LParen);
            this.OR1([
                { ALT: () => {
                        this.CONSUME(lexer_1.StaticRegister, { LABEL: 'condition' });
                    } },
                { ALT: () => {
                        this.CONSUME(lexer_1.SecretRegister, { LABEL: 'condition' });
                    } },
                { ALT: () => {
                        this.CONSUME(lexer_1.PublicRegister, { LABEL: 'condition' });
                    } }
            ]);
            this.CONSUME(lexer_1.RParen);
            this.CONSUME1(lexer_1.LCurly);
            this.SUBRULE1(this.statementBlock, { LABEL: 'tBlock' });
            this.CONSUME1(lexer_1.RCurly);
            this.CONSUME(lexer_1.Else);
            this.CONSUME2(lexer_1.LCurly);
            this.SUBRULE2(this.statementBlock, { LABEL: 'fBlock' });
            this.CONSUME2(lexer_1.RCurly);
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
            this.SUBRULE(this.expression, { LABEL: 'vector' });
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
            this.OR([
                { ALT: () => {
                        this.CONSUME(lexer_1.LParen);
                        this.SUBRULE(this.expression, { LABEL: 'expression' });
                        this.CONSUME(lexer_1.RParen);
                    } },
                { ALT: () => this.SUBRULE(this.vector, { LABEL: 'expression' }) },
                { ALT: () => this.SUBRULE(this.whenExpression, { LABEL: 'expression' }) },
                { ALT: () => this.CONSUME(lexer_1.Identifier) },
                { ALT: () => this.CONSUME(lexer_1.MutableRegister, { LABEL: 'register' }) },
                { ALT: () => this.CONSUME(lexer_1.StaticRegister, { LABEL: 'register' }) },
                { ALT: () => this.CONSUME(lexer_1.SecretRegister, { LABEL: 'register' }) },
                { ALT: () => this.CONSUME(lexer_1.PublicRegister, { LABEL: 'register' }) },
                { ALT: () => this.CONSUME(lexer_1.IntegerLiteral) }
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
            this.OR([
                { ALT: () => {
                        this.CONSUME(lexer_1.LParen);
                        this.SUBRULE(this.literalExpression, { LABEL: 'expression' });
                        this.CONSUME(lexer_1.RParen);
                    } },
                { ALT: () => this.CONSUME(lexer_1.IntegerLiteral, { LABEL: 'literal' }) }
            ]);
        });
        this.performSelfAnalysis();
    }
}
// EXPORT PARSER INSTANCE
// ================================================================================================
exports.parser = new AirParser();
//# sourceMappingURL=parser.js.map