// IMPORTS
// ================================================================================================
import { CstParser } from "chevrotain";
import {
    allTokens, Identifier, Define, Over, Prime, Field, LParen, RParen, IntegerLiteral, LCurly, RCurly,
    ExpOp, MulOp, AddOp, Transition, Registers, Steps, Enforce, Constraints, AssignOp, When, Else,
    RegisterRef, ReadonlyRegister, LSquare, RSquare, Comma, Using, DoubleDot, Colon, Semicolon,
    Readonly, Repeat, Spread, Ellipsis, Binary, RegisterBank, Minus, Slash, QMark, For, Equals, All, Each, Init, InitRegister
} from './lexer';
import { parserErrorMessageProvider } from "./errors";

// PARSER DEFINITION
// ================================================================================================
class AirParser extends CstParser {
    constructor() {
        super(allTokens, { errorMessageProvider: parserErrorMessageProvider });
        this.performSelfAnalysis();
    }

    // SCRIPT
    // --------------------------------------------------------------------------------------------
    public script = this.RULE('script', () => {
        this.CONSUME(Define);
        this.CONSUME(Identifier,                             { LABEL: 'starkName'             });
        this.CONSUME(Over);
        this.SUBRULE(this.fieldDeclaration,                  { LABEL: 'fieldDeclaration'      });
        this.CONSUME(LCurly);
        this.MANY(() => {
            this.OR([
                { ALT: () => {
                    this.SUBRULE(this.constantDeclaration,   { LABEL: 'globalConstants'       });
                }},
                { ALT: () => {
                    this.CONSUME(Transition);
                    this.SUBRULE1(this.literalExpression,    { LABEL: 'mutableRegisterCount'  });
                    this.CONSUME1(Registers);
                    this.SUBRULE(this.transitionFunction,    { LABEL: 'transitionFunction'    });
                }},
                { ALT: () => {
                    this.CONSUME(Enforce);
                    this.SUBRULE2(this.literalExpression,    { LABEL: 'constraintCount'       });
                    this.CONSUME(Constraints);
                    this.SUBRULE(this.transitionConstraints, { LABEL: 'transitionConstraints' });
                }},
                { ALT: () => {
                    this.CONSUME(Using);
                    this.SUBRULE3(this.literalExpression,    { LABEL: 'readonlyRegisterCount' });
                    this.CONSUME(Readonly);
                    this.CONSUME2(Registers);
                    this.SUBRULE(this.readonlyRegisters,     { LABEL: 'readonlyRegisters'     });
                }}
            ]);
        });
        this.CONSUME(RCurly);
    });

    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    private fieldDeclaration = this.RULE('fieldDeclaration', () => {
        this.CONSUME(Prime);
        this.CONSUME(Field);
        this.CONSUME(LParen);
        this.SUBRULE(this.literalExpression, { LABEL: 'modulus' });
        this.CONSUME(RParen);
    });

    // GLOBAL CONSTANTS
    // --------------------------------------------------------------------------------------------
    private constantDeclaration = this.RULE('constantDeclaration', () => {
        this.CONSUME(Identifier, { LABEL: 'constantName' });
        this.CONSUME(Colon);
        this.OR([
            { ALT: () => this.SUBRULE(this.literalExpression, { LABEL: 'value'  }) },
            { ALT: () => this.SUBRULE(this.literalVector,     { LABEL: 'vector' }) },
            { ALT: () => this.SUBRULE(this.literalMatrix,     { LABEL: 'matrix' }) }
        ]);
        this.CONSUME(Semicolon);
    });

    private literalVector = this.RULE('literalVector', () => {
        this.CONSUME(LSquare);
        this.AT_LEAST_ONE_SEP({
            SEP : Comma,
            DEF : () => this.SUBRULE(this.literalExpExpression, { LABEL: 'elements' })
        })
        this.CONSUME(RSquare);
    });

    private literalMatrix = this.RULE('literalMatrix', () => {
        this.CONSUME(LSquare);
        this.AT_LEAST_ONE_SEP({
            SEP : Comma,
            DEF : () => this.SUBRULE(this.literalMatrixRow, { LABEL: 'rows' })
        })
        this.CONSUME(RSquare);
    });

    private literalMatrixRow = this.RULE('literalMatrixRow', () => {
        this.CONSUME(LSquare);
        this.AT_LEAST_ONE_SEP({
            SEP : Comma,
            DEF : () => this.SUBRULE(this.literalExpression, { LABEL: 'elements' })
        })
        this.CONSUME(RSquare);
    })

    // READONLY REGISTERS
    // --------------------------------------------------------------------------------------------
    private readonlyRegisters = this.RULE('readonlyRegisters', () => {
        this.CONSUME(LCurly);
        this.AT_LEAST_ONE(() => this.SUBRULE(this.readonlyRegisterDefinition, { LABEL: 'registers' }));
        this.CONSUME(RCurly);
    });

    private readonlyRegisterDefinition = this.RULE('readonlyRegisterDefinition', () => {
        this.CONSUME1(ReadonlyRegister,          { LABEL: 'name' });
        this.CONSUME(Colon);
        this.OR1([
            { ALT: () => this.CONSUME2(Repeat,   { LABEL: 'pattern' }) },
            { ALT: () => this.CONSUME2(Spread,   { LABEL: 'pattern' }) }
        ]);
        this.OPTION(() => this.CONSUME(Binary,   { LABEL: 'binary'  }) );
        this.OR2([
            { ALT: () => {
                this.CONSUME(LSquare);
                this.CONSUME(Ellipsis);
                this.CONSUME(RSquare);
            }},
            { ALT: () => {
                this.SUBRULE(this.literalVector, { LABEL: 'values' });
            }}
        ]);        
        this.CONSUME(Semicolon);
    });

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    private transitionFunction = this.RULE('transitionFunction', () => {
        this.CONSUME(LCurly);
        this.SUBRULE(this.inputLoop, { LABEL: 'segment' });
        this.CONSUME(RCurly);
    });

    private transitionConstraints = this.RULE('transitionConstraints', () => {
        this.CONSUME(LCurly);
        this.SUBRULE(this.inputLoop, { LABEL: 'segment' });
        this.CONSUME(RCurly);
    });

    // LOOPS
    // --------------------------------------------------------------------------------------------
    private inputLoop = this.RULE('inputLoop', () => {
        this.CONSUME(For);
        this.CONSUME(Each);
        this.CONSUME(LParen);
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => this.CONSUME(InitRegister,           { LABEL: 'registers' })
        });
        this.CONSUME(RParen);
        this.CONSUME(LCurly);
        this.CONSUME(Init);
        this.OR1([
            { ALT: () => this.SUBRULE(this.statementBlock,  { LABEL: 'initExpression' })},
            { ALT: () => this.SUBRULE(this.expression,      { LABEL: 'initExpression' })}
        ]);
        this.OR2([
            { ALT: () => this.SUBRULE(this.inputLoop,       { LABEL: 'inputLoop'      })},
            { ALT: () => {
                this.AT_LEAST_ONE(() => {
                    this.SUBRULE(this.segmentLoop,          { LABEL: 'segmentLoops'    });
                });
            }}
        ]);
        this.CONSUME(RCurly);
    });

    private segmentLoop = this.RULE('segmentLoop', () => {
        this.CONSUME(For);
        this.CONSUME(Steps);
        this.CONSUME(LSquare);
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.literalRangeExpression, { LABEL: 'ranges' })
        });
        this.CONSUME(RSquare);
        this.SUBRULE(this.statementBlock,                        { LABEL: 'statements' });
    });

    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    public statementBlock = this.RULE('statementBlock', () => {
        this.CONSUME(LCurly);
        this.MANY(() => {
            this.SUBRULE(this.statement,    { LABEL: 'statements' });
        });
        this.SUBRULE1(this.expression,      { LABEL: 'expression' });
        this.OPTION1(() => {
            this.CONSUME(Equals);
            this.SUBRULE2(this.expression,  { LABEL: 'constraint' });
        });
        this.OPTION2(() => {
            this.CONSUME(Semicolon);
        });
        this.CONSUME(RCurly);
    });

    private statement = this.RULE('statement', () => {
        this.CONSUME(Identifier,                          { LABEL: 'variableName' });
        this.CONSUME(AssignOp);
        this.OR([
            {
                GATE: this.BACKTRACK(this.matrix),
                ALT : () => this.SUBRULE(this.matrix,     { LABEL: 'expression' })
            },
            {
                ALT : () => this.SUBRULE(this.expression, { LABEL: 'expression' }) 
            }
        ]);
        this.CONSUME(Semicolon);
    });

    // WHEN...ELSE EXPRESSION
    // --------------------------------------------------------------------------------------------
    private whenExpression = this.RULE('whenExpression', () => {
        this.OR([
            { ALT: () => {
                this.CONSUME(When);
                this.SUBRULE1(this.whenCondition,   { LABEL: 'condition'   });
                this.SUBRULE1(this.statementBlock,  { LABEL: 'tExpression' });
                this.CONSUME(Else);
                this.SUBRULE2(this.statementBlock,  { LABEL: 'fExpression' });
            }},
            { ALT: () => {
                this.SUBRULE2(this.whenCondition,   { LABEL: 'condition'   });
                this.CONSUME(QMark);
                this.SUBRULE1(this.expression,      { LABEL: 'tExpression' });
                this.CONSUME(Colon);
                this.SUBRULE2(this.expression,      { LABEL: 'fExpression' });
            }}
        ]);
    });

    private whenCondition = this.RULE('whenCondition', () => {
        this.OR([
            { ALT: () => {
                this.CONSUME(LParen);
                this.CONSUME1(RegisterRef,  { LABEL: 'register' });
                this.CONSUME(RParen);
            }},
            { ALT: () => {
                this.CONSUME2(RegisterRef,  { LABEL: 'register' });
            }}
        ]);
    });

    // TRANSITION CALL EXPRESSION
    // --------------------------------------------------------------------------------------------
    private transitionCall = this.RULE('transitionCall', () => {
        this.CONSUME(Transition);
        this.CONSUME(LParen);
        this.CONSUME(RegisterBank,  { LABEL: 'registers' });
        this.CONSUME(RParen);
    });

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    private vector = this.RULE('vector', () => {
        this.CONSUME(LSquare);
        this.AT_LEAST_ONE_SEP({
            SEP : Comma,
            DEF : () => {
                this.OR([
                    { ALT: () => this.SUBRULE(this.expression,          { LABEL: 'elements' })},
                    { ALT: () => this.SUBRULE(this.vectorDestructuring, { LABEL: 'elements' })}
                ]);
            }
        })
        this.CONSUME(RSquare);
    });

    private vectorDestructuring = this.RULE('vectorDestructuring', () => {
        this.CONSUME(Ellipsis);
        this.SUBRULE(this.vectorExpression, { LABEL: 'vector' });
    });

    private matrix = this.RULE('matrix', () => {
        this.CONSUME(LSquare);
        this.AT_LEAST_ONE_SEP({
            SEP : Comma,
            DEF : () => this.SUBRULE(this.matrixRow, { LABEL: 'rows' })
        })
        this.CONSUME(RSquare);
    });

    private matrixRow = this.RULE('matrixRow', () => {
        this.CONSUME(LSquare);
        this.AT_LEAST_ONE_SEP({
            SEP : Comma,
            DEF : () => this.SUBRULE(this.expression, { LABEL: 'elements' })
        })
        this.CONSUME(RSquare);
    })

    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    private expression = this.RULE('expression', () => {
        this.SUBRULE1(this.mulExpression,     { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(AddOp);
            this.SUBRULE2(this.mulExpression, { LABEL: 'rhs' });
        });
    });

    private mulExpression = this.RULE('mulExpression', () => {
        this.SUBRULE1(this.expExpression,     { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(MulOp);
            this.SUBRULE2(this.expExpression, { LABEL: 'rhs' });
        });
    });

    private expExpression = this.RULE('expExpression', () => {
        this.SUBRULE1(this.vectorExpression,     { LABEL: 'base' });
        this.MANY(() => {
            this.CONSUME(ExpOp);
            this.SUBRULE2(this.atomicExpression, { LABEL: 'exponent' });  
        });
    });

    private vectorExpression = this.RULE('vectorExpression', () => {
        this.SUBRULE(this.atomicExpression,         { LABEL: 'expression' });
        this.OPTION(() => {
            this.CONSUME(LSquare);
            this.OR([
                { ALT: () => {
                    this.CONSUME1(IntegerLiteral,   { LABEL: 'rangeStart' });
                    this.CONSUME(DoubleDot);
                    this.CONSUME2(IntegerLiteral,   { LABEL: 'rangeEnd'   });
                }},
                { ALT: () => {
                    this.CONSUME3(IntegerLiteral,   { LABEL: 'index'      });
                }}
            ]);
            this.CONSUME(RSquare);
        });
    });

    private atomicExpression = this.RULE('atomicExpression', () => {
        this.OPTION(() => {
            this.OR1([
                { ALT: () => this.CONSUME(Minus,     { LABEL: 'neg' })},
                { ALT: () => this.CONSUME(Slash,     { LABEL: 'inv' })}
            ])
        });
        this.OR2([
            { GATE: this.BACKTRACK(this.whenExpression), ALT: () => {
                this.SUBRULE(this.whenExpression,           { LABEL: 'expression' })    // TODO: move to statement block?
            }},
            { ALT: () => {
                this.CONSUME(LParen);
                this.SUBRULE(this.expression,               { LABEL: 'expression' });
                this.CONSUME(RParen);
            }},
            { ALT: () => this.SUBRULE(this.vector,          { LABEL: 'expression' })},
            { ALT: () => this.SUBRULE(this.transitionCall,  { LABEL: 'expression' })},
            { ALT: () => this.CONSUME(Identifier,           { LABEL: 'symbol'     })},
            { ALT: () => this.CONSUME(RegisterRef,          { LABEL: 'symbol'     })},
            { ALT: () => this.CONSUME(RegisterBank,         { LABEL: 'symbol'     })},
            { ALT: () => this.CONSUME(IntegerLiteral,       { LABEL: 'literal'    })}
        ]);
    });

    // LITERAL EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    private literalExpression = this.RULE('literalExpression', () => {
        this.SUBRULE1(this.literalMulExpression,     { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(AddOp);
            this.SUBRULE2(this.literalMulExpression, { LABEL: 'rhs'});
        });
    });

    private literalMulExpression = this.RULE('literalMulExpression', () => {
        this.SUBRULE1(this.literalExpExpression,     { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(MulOp);
            this.SUBRULE2(this.literalExpExpression, { LABEL: 'rhs'});
        });
    });

    private literalExpExpression = this.RULE('literalExpExpression', () => {
        this.SUBRULE1(this.literalAtomicExpression,     { LABEL: 'base' });
        this.MANY(() => {
            this.CONSUME(ExpOp);
            this.SUBRULE2(this.literalAtomicExpression, { LABEL: 'exponent' });  
        });
    });

    private literalAtomicExpression = this.RULE('literalAtomicExpression', () => {
        this.OPTION(() => {
            this.OR1([
                { ALT: () => this.CONSUME(Minus,     { LABEL: 'neg' })},
                { ALT: () => this.CONSUME(Slash,     { LABEL: 'inv' })}
            ])
        });
        this.OR2([
            { ALT: () => {
                this.CONSUME(LParen);
                this.SUBRULE(this.literalExpression, { LABEL: 'expression' });
                this.CONSUME(RParen);        
            }},
            { ALT: () => {
                this.CONSUME(IntegerLiteral,         { LABEL: 'literal' });
            }}
        ]);
    });

    private literalRangeExpression = this.RULE('literalRangeExpression', () => {
        this.CONSUME1(IntegerLiteral,       { LABEL: 'start' });
        this.OPTION(() => {
            this.CONSUME(DoubleDot);
            this.CONSUME2(IntegerLiteral,   { LABEL: 'end'   });
        });
    });
}

// EXPORT PARSER INSTANCE
// ================================================================================================
export const parser = new AirParser();