// IMPORTS
// ================================================================================================
import { CstParser } from "chevrotain";
import {
    allTokens, Identifier, Define, Over, Prime, Field, LParen, RParen, IntegerLiteral, LCurly, RCurly,
    ExpOp, MulOp, AddOp, Transition, Registers, In, Steps, Enforce, Constraints,
    MutableRegister, StaticRegister, SecretRegister, PublicRegister, LSquare, RSquare, Comma, Using,
    Readonly, Repeat, Spread, Ellipsis, DoubleDot, Colon, Semicolon, Binary, When, Else
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
        this.SUBRULE(this.literalParenExpression, { LABEL: 'modulus' });
    });

    // STATIC CONSTANTS
    // --------------------------------------------------------------------------------------------
    private constantDeclaration = this.RULE('constantDeclaration', () => {
        this.CONSUME(Identifier, { LABEL: 'constantName' });
        this.CONSUME(Colon);
        this.OR([
            { ALT: () => this.SUBRULE(this.literalAddExpression, { LABEL: 'value'  }) },
            { ALT: () => this.SUBRULE(this.literalVector,        { LABEL: 'vector' }) },
            { ALT: () => this.SUBRULE(this.literalMatrix,        { LABEL: 'matrix' }) }
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
        this.AT_LEAST_ONE(() => {
            this.OR([
                { ALT: () => {
                    this.SUBRULE(this.staticRegisterDefinition, { LABEL: 'staticRegisters' })
                }},
                { ALT: () => {
                    this.SUBRULE(this.secretRegisterDefinition, { LABEL: 'secretRegisters' })
                }},
                { ALT: () => {
                    this.SUBRULE(this.publicRegisterDefinition, { LABEL: 'publicRegisters' })
                }}
            ]);
        });
        this.CONSUME(RCurly);
    });

    private staticRegisterDefinition = this.RULE('staticRegisterDefinition', () => {
        this.CONSUME1(StaticRegister, { LABEL: 'name' });
        this.CONSUME(Colon);
        this.OR([
            { ALT: () => { this.CONSUME2(Repeat, { LABEL: 'pattern' }) }},
            { ALT: () => { this.CONSUME2(Spread, { LABEL: 'pattern' }) }}
        ]);
        this.OPTION(() => {
            this.CONSUME(Binary,         { LABEL: 'binary' });
        });
        this.SUBRULE(this.literalVector, { LABEL: 'values' });
        this.CONSUME(Semicolon);
    });

    private secretRegisterDefinition = this.RULE('secretRegisterDefinition', () => {
        this.CONSUME1(SecretRegister, { LABEL: 'name' });
        this.CONSUME(Colon);
        this.OR([
            { ALT: () => { this.CONSUME2(Repeat, { LABEL: 'pattern' }) }},
            { ALT: () => { this.CONSUME2(Spread, { LABEL: 'pattern' }) }}
        ]);
        this.OPTION(() => {
            this.CONSUME(Binary,         { LABEL: 'binary' });
        });
        this.CONSUME(LSquare);
        this.CONSUME(Ellipsis);
        this.CONSUME(RSquare);
        this.CONSUME(Semicolon);
    });

    private publicRegisterDefinition = this.RULE('publicRegisterDefinition', () => {
        this.CONSUME1(PublicRegister, { LABEL: 'name' });
        this.CONSUME(Colon);
        this.OR([
            { ALT: () => { this.CONSUME2(Repeat, { LABEL: 'pattern' }) }},
            { ALT: () => { this.CONSUME2(Spread, { LABEL: 'pattern' }) }}
        ]);
        this.OPTION(() => {
            this.CONSUME(Binary,         { LABEL: 'binary' });
        });
        this.CONSUME(LSquare);
        this.CONSUME(Ellipsis);
        this.CONSUME(RSquare);
        this.CONSUME(Semicolon);
    });

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    private transitionFunction = this.RULE('transitionFunction', () => {
        this.CONSUME(LCurly);
        this.OR([
            { ALT: () => {
                this.SUBRULE(this.statementBlock,   { LABEL: 'statements' });
            }},
            { ALT: () => {
                this.SUBRULE(this.whenStatement,    { LABEL: 'statements' });
            }}
        ]);
        this.CONSUME(RCurly);
    });

    private transitionConstraints = this.RULE('transitionConstraints', () => {
        this.CONSUME(LCurly);
        this.OR([
            { ALT: () => {
                this.SUBRULE(this.statementBlock,   { LABEL: 'statements' });
            }},
            { ALT: () => {
                this.SUBRULE(this.whenStatement,    { LABEL: 'statements' });
            }}
        ]);
        this.CONSUME(RCurly);
    });

    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    public statementBlock = this.RULE('statementBlock', () => {
        this.MANY(() => {
            this.SUBRULE(this.statement, { LABEL: 'statements'})
        });
        this.SUBRULE(this.outStatement);
    });

    private statement = this.RULE('statement', () => {
        this.CONSUME(Identifier, { LABEL: 'variableName' });
        this.CONSUME(Colon);
        this.OR([
            { ALT: () => this.SUBRULE(this.expression,  { LABEL: 'expression' }) },
            { ALT: () => this.SUBRULE(this.vector,      { LABEL: 'expression' }) },
            { ALT: () => this.SUBRULE(this.matrix,      { LABEL: 'expression' }) }
        ]);
        this.CONSUME(Semicolon);
    });

    private outStatement = this.RULE('outStatement', () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.expression,  { LABEL: 'expression' }) },
            { ALT: () => this.SUBRULE(this.vector,      { LABEL: 'vector'     }) }
        ]);
        this.CONSUME(Semicolon);
    });

    // WHEN STATEMENT
    // --------------------------------------------------------------------------------------------
    private whenStatement = this.RULE('whenStatement', () => {
        this.CONSUME(When);
        this.CONSUME(LParen);
        this.OR1([
            { ALT: () => {
                this.CONSUME(StaticRegister,        { LABEL: 'condition'   });
            }},
            { ALT: () => {
                this.CONSUME(SecretRegister,        { LABEL: 'condition'   });
            }},
            { ALT: () => {
                this.CONSUME(PublicRegister,        { LABEL: 'condition'   });
            }}
        ]);
        this.CONSUME(RParen);
        this.CONSUME1(LCurly);
        this.OR2([
            { ALT: () => {
                this.SUBRULE1(this.statementBlock,  { LABEL: 'tBlock' });
            }},
            { ALT: () => {
                this.SUBRULE2(this.whenStatement,   { LABEL: 'tBlock' });
            }}
        ]);
        this.CONSUME1(RCurly);
        this.CONSUME(Else);
        this.CONSUME2(LCurly);
        this.OR3([
            { ALT: () => {
                this.SUBRULE3(this.statementBlock,  { LABEL: 'fBlock' });
            }},
            { ALT: () => {
                this.SUBRULE4(this.whenStatement,   { LABEL: 'fBlock' });
            }}
        ]);
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
        this.CONSUME(Identifier, { LABEL: 'vectorName' });
    });

    private vectorRangeSelector = this.RULE('vectorRangeSelector', () => {
        this.CONSUME(Identifier,      { LABEL: 'vectorName' });
        this.CONSUME(LSquare);
        this.CONSUME1(IntegerLiteral, { LABEL: 'rangeStart' });
        this.CONSUME(DoubleDot);
        this.CONSUME2(IntegerLiteral, { LABEL: 'rangeEnd' });
        this.CONSUME(RSquare);
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
        this.SUBRULE(this.addExpression);
    });

    private addExpression = this.RULE('addExpression', () => {
        this.SUBRULE(this.mulExpression, { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(AddOp);
            this.SUBRULE2(this.mulExpression, { LABEL: 'rhs'});
        });
    });

    private mulExpression = this.RULE('mulExpression', () => {
        this.SUBRULE(this.expExpression, { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(MulOp);
            this.SUBRULE2(this.expExpression, { LABEL: 'rhs'});
        });
    });

    private expExpression = this.RULE('expExpression', () => {
        this.SUBRULE(this.atomicExpression, { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(ExpOp);
            this.SUBRULE2(this.atomicExpression, { LABEL: 'rhs' });  
        });
    });

    private atomicExpression = this.RULE('atomicExpression', () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.parenExpression)         },
            { ALT: () => this.SUBRULE(this.vectorRangeSelector)     },
            { ALT: () => this.CONSUME(Identifier)                   },
            { ALT: () => this.CONSUME(MutableRegister)              },
            { ALT: () => this.CONSUME(StaticRegister)               },
            { ALT: () => this.CONSUME(SecretRegister)               },
            { ALT: () => this.CONSUME(PublicRegister)               },
            { ALT: () => this.CONSUME(IntegerLiteral)               }
        ]);
    });

    private parenExpression = this.RULE('parenExpression', () => {
        this.CONSUME(LParen);
        this.SUBRULE(this.expression);
        this.CONSUME(RParen);
    });

    // LITERAL EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    private literalExpression = this.RULE('literalExpression', () => {
        this.SUBRULE(this.literalAddExpression);
    });

    private literalAddExpression = this.RULE('literalAddExpression', () => {
        this.SUBRULE(this.literalMulExpression, { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(AddOp);
            this.SUBRULE2(this.literalMulExpression, { LABEL: 'rhs'});
        });
    });

    private literalMulExpression = this.RULE('literalMulExpression', () => {
        this.SUBRULE(this.literalExpExpression, { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(MulOp);
            this.SUBRULE2(this.literalExpExpression, { LABEL: 'rhs'});
        });
    });

    private literalExpExpression = this.RULE('literalExpExpression', () => {
        this.SUBRULE(this.literalAtomicExpression, { LABEL: 'lhs' });
        this.MANY(() => {
            this.CONSUME(ExpOp);
            this.SUBRULE2(this.literalAtomicExpression, { LABEL: 'rhs' });  
        });
    });

    private literalAtomicExpression = this.RULE('literalAtomicExpression', () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.literalParenExpression) },
            { ALT: () => this.CONSUME(IntegerLiteral) },
        ]);
    });

    private literalParenExpression = this.RULE('literalParenExpression', () => {
        this.CONSUME(LParen);
        this.SUBRULE(this.literalExpression);
        this.CONSUME(RParen);
    });
}

// EXPORT PARSER INSTANCE
// ================================================================================================
export const parser = new AirParser();