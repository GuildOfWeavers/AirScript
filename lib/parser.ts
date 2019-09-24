// IMPORTS
// ================================================================================================
import { CstParser } from "chevrotain";
import {
    allTokens, Identifier, Define, Over, Prime, Field, LParen, RParen, IntegerLiteral, LCurly, RCurly,
    ExpOp, MulOp, AddOp, Transition, Registers, In, Steps, Enforce, Constraints, AssignOp,
    ReadonlyRegister, LSquare, RSquare, Comma, Using,
    Readonly, Repeat, Spread, Ellipsis, DoubleDot, Colon, Semicolon, Binary, When, Else, RegisterRef
} from './lexer';
import { parserErrorMessageProvider } from "./errors";

// PARSER DEFINITION
// ================================================================================================
class AirParser extends CstParser {
    constructor() {
        super(allTokens, { errorMessageProvider: parserErrorMessageProvider });
        this.performSelfAnalysis();
    }

    public script = this.RULE('script', () => {
        this.CONSUME(Define);
        this.CONSUME(Identifier,                             { LABEL: 'starkName'             });
        this.CONSUME(Over);
        this.SUBRULE(this.fieldDeclaration,                  { LABEL: 'fieldDeclaration'      });
        this.CONSUME(LCurly);
        this.MANY(() => {
            this.OR([
                { ALT: () => {
                    this.SUBRULE(this.constantDeclaration,   { LABEL: 'staticConstants'       });
                }},
                { ALT: () => {
                    this.CONSUME(Transition);
                    this.SUBRULE2(this.literalExpression,    { LABEL: 'mutableRegisterCount'  });
                    this.CONSUME1(Registers);
                    this.CONSUME(In);
                    this.SUBRULE3(this.literalExpression,    { LABEL: 'steps'                 });
                    this.CONSUME(Steps);
                    this.SUBRULE(this.transitionFunction,    { LABEL: 'transitionFunction'    });
                }},
                { ALT: () => {
                    this.CONSUME(Enforce);
                    this.SUBRULE4(this.literalExpression,    { LABEL: 'constraintCount'       });
                    this.CONSUME(Constraints);
                    this.SUBRULE(this.transitionConstraints, { LABEL: 'transitionConstraints' });
                }},
                { ALT: () => {
                    this.CONSUME(Using);
                    this.SUBRULE6(this.literalExpression,    { LABEL: 'readonlyRegisterCount' });
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

    // STATIC CONSTANTS
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
        this.CONSUME1(ReadonlyRegister,        { LABEL: 'name' });
        this.CONSUME(Colon);
        this.OR1([
            { ALT: () => this.CONSUME2(Repeat, { LABEL: 'pattern' }) },
            { ALT: () => this.CONSUME2(Spread, { LABEL: 'pattern' }) }
        ]);
        this.OPTION(() => {
            this.CONSUME(Binary,               { LABEL: 'binary' });
        });
        this.OR2([
            { ALT: () => {
                this.CONSUME(LSquare);
                this.CONSUME(Ellipsis);
                this.CONSUME(RSquare);
            }},
            { ALT: () => this.SUBRULE(this.literalVector, { LABEL: 'values' })}
        ]);        
        this.CONSUME(Semicolon);
    });

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    private transitionFunction = this.RULE('transitionFunction', () => {
        this.CONSUME(LCurly);
        this.SUBRULE(this.statementBlock, { LABEL: 'statements' });
        this.CONSUME(RCurly);
    });

    private transitionConstraints = this.RULE('transitionConstraints', () => {
        this.CONSUME(LCurly);
        this.SUBRULE(this.statementBlock, { LABEL: 'statements' });
        this.CONSUME(RCurly);
    });

    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    public statementBlock = this.RULE('statementBlock', () => {
        this.MANY(() => {
            this.SUBRULE(this.statement, { LABEL: 'statements' });
        });
        this.SUBRULE(this.expression,    { LABEL: 'expression' });
        this.OPTION(() => {
            this.CONSUME(Semicolon);
        });
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
                GATE: this.BACKTRACK(this.expression),
                ALT : () => this.SUBRULE(this.expression, { LABEL: 'expression' }) 
            }
        ]);
        this.CONSUME(Semicolon);
    });

    // WHEN...ELSE EXPRESSION
    // --------------------------------------------------------------------------------------------
    private whenExpression = this.RULE('whenExpression', () => {
        this.CONSUME(When);
        this.CONSUME(LParen);
        this.CONSUME(RegisterRef,           { LABEL: 'condition' });
        this.CONSUME(RParen);
        this.CONSUME1(LCurly);
        this.SUBRULE1(this.statementBlock,  { LABEL: 'tBlock'   });
        this.CONSUME1(RCurly);
        this.CONSUME(Else);
        this.CONSUME2(LCurly);
        this.SUBRULE2(this.statementBlock,  { LABEL: 'fBlock'   });
        this.CONSUME2(RCurly);
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
        this.SUBRULE(this.expression, { LABEL: 'vector' });
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
        this.OR([
            { ALT: () => {
                this.CONSUME(LParen);
                this.SUBRULE(this.expression,               { LABEL: 'expression' });
                this.CONSUME(RParen);
            }},
            { ALT: () => this.SUBRULE(this.vector,          { LABEL: 'expression' })},
            { ALT: () => this.SUBRULE(this.whenExpression,  { LABEL: 'expression' })},
            { ALT: () => this.CONSUME(Identifier,           { LABEL: 'variable'   })},
            { ALT: () => this.CONSUME(RegisterRef,          { LABEL: 'register'   })},
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
        this.OR([
            { ALT: () => {
                this.CONSUME(LParen);
                this.SUBRULE(this.literalExpression,  { LABEL: 'expression' });
                this.CONSUME(RParen);        
            }},
            { ALT: () => this.CONSUME(IntegerLiteral, { LABEL: 'literal' })}
        ]);
    });
}

// EXPORT PARSER INSTANCE
// ================================================================================================
export const parser = new AirParser();