// IMPORTS
// ================================================================================================
import { CstParser } from "chevrotain";
import {
    allTokens, Define, Over, Prime, Field, Const, Static, Cycle, Prng, Input, Public, Secret, Element,
    Boolean, Transition, Registers, Enforce, Constraints, For, All, Steps, Each, Init, Yield, When, Else,
    Import, From, Identifier, IntegerLiteral, TraceRegister, RegisterBank, HexLiteral, StringLiteral,
    LParen, RParen, LCurly, RCurly, LSquare, RSquare, Slash, QMark, Comma, Colon, Semicolon,
    ExpOp, MulOp, AddOp, AssignOp, Minus, Ellipsis, DoubleDot, Equals, As, With
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
        this.MANY1(() => this.SUBRULE(this.importExpression,      { LABEL: 'imports'          }));
        this.CONSUME(Define);
        this.CONSUME(Identifier,                                  { LABEL: 'starkName'        });
        this.CONSUME(Over);
        this.SUBRULE(this.fieldDeclaration,                       { LABEL: 'fieldDeclaration' });
        this.CONSUME(LCurly);
        this.MANY2(() => {
            this.OR([
                { ALT: () => this.SUBRULE(this.constDeclaration,  { LABEL: 'moduleConstants'  })},
                { ALT: () => this.SUBRULE(this.inputDeclaration,  { LABEL: 'inputRegisters'   })},
                { ALT: () => this.SUBRULE(this.staticDeclaration, { LABEL: 'staticRegisters'  })},
                { ALT: () => {
                    this.CONSUME(Transition);
                    this.CONSUME1(IntegerLiteral,            { LABEL: 'traceRegisterCount'    });
                    this.CONSUME(Registers);
                    this.SUBRULE(this.transitionFunction,    { LABEL: 'transitionFunction'    });
                }},
                { ALT: () => {
                    this.CONSUME(Enforce);
                    this.CONSUME2(IntegerLiteral,            { LABEL: 'constraintCount'       });
                    this.CONSUME(Constraints);
                    this.SUBRULE(this.transitionConstraints, { LABEL: 'transitionConstraints' });
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

    // MODULE CONSTANTS
    // --------------------------------------------------------------------------------------------
    private constDeclaration = this.RULE('constantDeclaration', () => {
        this.CONSUME(Const);
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
            DEF : () => this.SUBRULE(this.literalVector, { LABEL: 'rows' })
        })
        this.CONSUME(RSquare);
    });

    // INPUT AND STATIC REGISTERS
    // --------------------------------------------------------------------------------------------
    private inputDeclaration = this.RULE('inputDeclaration', () => {
        this.OR1([
            { ALT: () => this.CONSUME(Public,   { LABEL: 'scope'   })},
            { ALT: () => this.CONSUME(Secret,   { LABEL: 'scope'   })}
        ]);
        this.CONSUME(Input);
        this.CONSUME(Identifier,                { LABEL: 'name'    });
        this.CONSUME(Colon);
        this.OR2([
            { ALT: () => this.CONSUME(Element,  { LABEL: 'type'   })},
            { ALT: () => this.CONSUME(Boolean,  { LABEL: 'type'   })},
        ]);
        this.CONSUME1(LSquare);
        this.CONSUME1(IntegerLiteral,           { LABEL: 'width'   });
        this.CONSUME1(RSquare);
        this.OPTION(() => {
            this.CONSUME2(LSquare);
            this.CONSUME2(IntegerLiteral,       { LABEL: 'rank'   });
            this.CONSUME2(RSquare);
        });
        this.CONSUME(Semicolon);
    });

    private staticDeclaration = this.RULE('staticDeclaration', () => {
        this.CONSUME(Static);
        this.CONSUME(Identifier,                                  { LABEL: 'name'    });
        this.CONSUME(Colon);
        this.OR([
            { ALT: () => this.SUBRULE1(this.staticRegister,       { LABEL: 'registers' })},
            { ALT: () => {
                this.CONSUME(LSquare);
                this.AT_LEAST_ONE_SEP({
                    SEP: Comma,
                    DEF: () => this.SUBRULE2(this.staticRegister, { LABEL: 'registers' })
                });
                this.CONSUME(RSquare);
            }}
        ]);
        this.CONSUME(Semicolon);
    });

    private staticRegister = this.RULE('staticRegister', () => {
        this.CONSUME(Cycle);
        this.OR([
            { ALT: () => this.SUBRULE(this.literalVector, { LABEL: 'values'   })},
            { ALT: () => this.SUBRULE(this.prngSequence,  { LABEL: 'sequence' })}
        ]);
    });

    private prngSequence = this.RULE('prngSequence', () => {
        this.CONSUME(Prng);
        this.CONSUME(LParen);
        this.CONSUME(Identifier,     { LABEL: 'method' });
        this.CONSUME1(Comma);
        this.CONSUME(HexLiteral,     { LABEL: 'seed' });
        this.CONSUME2(Comma);
        this.CONSUME(IntegerLiteral, { LABEL: 'count' });
        this.CONSUME(RParen);
    });

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    private transitionFunction = this.RULE('transitionFunction', () => {
        this.CONSUME(LCurly);
        this.SUBRULE(this.inputLoop, { LABEL: 'inputLoop', ARGS: [ 'yield' ] });
        this.CONSUME(RCurly);
    });

    private transitionConstraints = this.RULE('transitionConstraints', () => {
        this.CONSUME(LCurly);
        this.OR([
            { ALT: () => this.SUBRULE(this.inputLoop, { LABEL: 'inputLoop', ARGS: [ 'enforce' ] })},
            { ALT: () => {
                this.CONSUME(For);
                this.CONSUME(All);
                this.CONSUME(Steps);
                this.SUBRULE(this.statementBlock,      { LABEL: 'allStepBlock', ARGS: [ 'enforce' ] })
            }}
        ]);
        this.CONSUME(RCurly);
    });

    // LOOPS
    // --------------------------------------------------------------------------------------------
    private inputLoop = this.RULE('inputLoop', (context: 'yield' | 'enforce') => {
        this.CONSUME(For);
        this.CONSUME(Each);
        this.CONSUME(LParen);
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => this.CONSUME(Identifier,         { LABEL: 'inputs' })
        });
        this.CONSUME(RParen);
        this.CONSUME(LCurly);
        this.MANY(() => this.SUBRULE(this.statement,    { LABEL: 'statements' }));
        this.SUBRULE(this.traceBlock,                   { LABEL: 'block', ARGS: [ context] });
        this.CONSUME(RCurly);
    });

    public traceBlock = this.RULE('traceBlock', (context?: 'yield' | 'enforce') => {
        this.CONSUME(Init);
        this.SUBRULE(this.statementBlock,       { LABEL: 'initExpression', ARGS: [ context ] });
        this.OR([
            { ALT: () => {
                this.SUBRULE(this.inputLoop,    { LABEL: 'inputLoop',      ARGS: [ context ] });
            }},
            { ALT: () => this.AT_LEAST_ONE(() => {
                this.SUBRULE(this.traceSegment, { LABEL: 'traceSegments',  ARGS: [ context ] });
            })}
        ]);
    });

    private traceSegment = this.RULE('traceSegment', (context: 'yield' | 'enforce') => {
        this.CONSUME(For);
        this.CONSUME(Steps);
        this.CONSUME(LSquare);
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.literalRangeExpression, { LABEL: 'ranges' })
        });
        this.CONSUME(RSquare);
        this.SUBRULE(this.statementBlock,   { LABEL: 'body', ARGS: [ context ] });
    });

    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    public statementBlock = this.RULE('statementBlock', (context?: 'yield' | 'enforce') => {
        this.CONSUME(LCurly);
        this.MANY(() => this.SUBRULE(this.statement,    { LABEL: 'statements' }));

        if (context === 'yield') {
            this.CONSUME(Yield);
            this.SUBRULE1(this.assignableExpression,    { LABEL: 'expression' });
            this.CONSUME1(Semicolon);
        }
        else if (context === 'enforce') {
            this.CONSUME(Enforce);
            this.SUBRULE2(this.assignableExpression,    { LABEL: 'expression' });
            this.CONSUME(Equals);
            this.SUBRULE(this.expression,               { LABEL: 'constraint' });
            this.CONSUME2(Semicolon);
        }
        else {
            this.SUBRULE3(this.assignableExpression,    { LABEL: 'expression' });
            this.OPTION(() => this.CONSUME3(Semicolon));
        }
        this.CONSUME(RCurly);
    });

    private statement = this.RULE('statement', () => {
        this.CONSUME(Identifier,                { LABEL: 'variableName' });
        this.CONSUME(AssignOp);
        this.SUBRULE(this.assignableExpression, { LABEL: 'expression' });
        this.CONSUME(Semicolon);
    });

    private assignableExpression = this.RULE('assignableExpression', () => {
        this.OR([
            {
                GATE: this.BACKTRACK(this.matrix),
                ALT : () => this.SUBRULE(this.matrix,        { LABEL: 'expression' })
            },
            {
                GATE: this.BACKTRACK(this.whenExpression),
                ALT: () => this.SUBRULE(this.whenExpression, { LABEL: 'expression' })
            },
            {
                ALT : () => this.SUBRULE(this.expression,    { LABEL: 'expression' }) 
            },
            {
                ALT: () => this.SUBRULE(this.statementBlock, { LABEL: 'expression' })
            }
        ]);
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
                this.CONSUME1(Identifier,   { LABEL: 'value' });
                this.CONSUME(RParen);
            }},
            { ALT: () => {
                this.CONSUME2(Identifier,   { LABEL: 'value' });
            }}
        ]);
    });

    // FUNCTION CALLS
    // --------------------------------------------------------------------------------------------
    private transitionCall = this.RULE('transitionCall', () => {
        this.CONSUME(Transition);
        this.CONSUME(LParen);
        this.CONSUME(RegisterBank,  { LABEL: 'registers' });
        this.CONSUME(RParen);
    });

    private functionCall = this.RULE('functionCall', (context?: 'yield' | 'enforce') => {
        this.CONSUME(With);
        this.CONSUME(RegisterBank,                    { LABEL: 'registers' });
        this.CONSUME(LSquare);
        this.SUBRULE(this.literalRangeExpression,     { LABEL: 'range'     });
        this.CONSUME(RSquare);
        if (context === 'yield') {
            this.CONSUME(Yield);
        }
        else {
            this.CONSUME(Enforce);
        }
        this.CONSUME(Identifier,                      { LABEL: 'funcName'   });
        this.CONSUME(LParen);
        this.AT_LEAST_ONE_SEP({
            SEP : Comma,
            DEF : () => this.SUBRULE(this.expression, { LABEL: 'parameters' })
        });
        this.CONSUME(RParen);
        this.CONSUME(Semicolon);
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
        });
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
            { ALT: () => {
                this.CONSUME(LParen);
                this.SUBRULE(this.expression,               { LABEL: 'expression' });
                this.CONSUME(RParen);
            }},
            { ALT: () => this.SUBRULE(this.vector,          { LABEL: 'expression' })},
            { ALT: () => this.SUBRULE(this.transitionCall,  { LABEL: 'expression' })},
            { ALT: () => this.CONSUME(Identifier,           { LABEL: 'symbol'     })},
            { ALT: () => this.CONSUME(TraceRegister,        { LABEL: 'symbol'     })},
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

    // IMPORTS
    // --------------------------------------------------------------------------------------------
    private importExpression = this.RULE('importExpression', () => {
        this.CONSUME(Import);
        this.CONSUME(LCurly);
        this.AT_LEAST_ONE_SEP({
            SEP : Comma,
            DEF : () => this.SUBRULE(this.importMember, { LABEL: 'members' })
        });
        this.CONSUME(RCurly);
        this.CONSUME(From);
        this.CONSUME(StringLiteral,                     { LABEL: 'path'    });
        this.CONSUME(Semicolon);
    });

    private importMember = this.RULE('importMember', () => {
        this.CONSUME1(Identifier,       { LABEL: 'member' });
        this.OPTION(() => {
            this.CONSUME(As);
            this.CONSUME2(Identifier,   { LABEL: 'alias'  });
        });
    });
}

// EXPORT PARSER INSTANCE
// ================================================================================================
export const parser = new AirParser();