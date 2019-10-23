// IMPORTS
// ================================================================================================
import { CstParser } from "chevrotain";
import {
    allTokens, LParen, RParen, Module, Field, Literal, Prime, Const, Vector, Matrix, Fixed, Input,
    Repeat, Spread, Binary, Frame, Scalar, Local, Get, Slice, BinaryOp, UnaryOp, LoadOp, SaveOp,
    Transition, Evaluation, Secret, Public
} from './lexer';
import { parserErrorMessageProvider } from "../errors";

// PARSER DEFINITION
// ================================================================================================
class AirParser extends CstParser {
    constructor() {
        super(allTokens, { errorMessageProvider: parserErrorMessageProvider });
        this.performSelfAnalysis();
    }

    // MODULE
    // --------------------------------------------------------------------------------------------
    public module = this.RULE('module', () => {
        this.CONSUME1(LParen);
        this.CONSUME(Module);
        this.SUBRULE(this.fieldDeclaration,                             { LABEL: 'field'              });
        this.MANY(() => this.OR([
            { ALT: () => this.SUBRULE(this.constantDeclaration,         { LABEL: 'constants'          })},
            { ALT: () => this.SUBRULE(this.staticRegister,              { LABEL: 'staticRegisters'    })},
            { ALT: () => this.SUBRULE(this.inputRegister,               { LABEL: 'inputRegisters'     })},
            { ALT: () => {
                this.CONSUME2(LParen);
                this.CONSUME(Transition);
                this.SUBRULE1(this.transitionSignature,                 { LABEL: 'tFunctionSignature' });
                this.AT_LEAST_ONE1(() => this.SUBRULE1(this.expression, { LABEL: 'tFunctionBody'      }));
                this.CONSUME2(RParen);
            }},
            { ALT: () => {
                this.CONSUME3(LParen);
                this.CONSUME(Evaluation);
                this.SUBRULE2(this.transitionSignature,                 { LABEL: 'tConstraintsSignature' });
                this.AT_LEAST_ONE2(() => this.SUBRULE2(this.expression, { LABEL: 'tConstraintsBody'      }));
                this.CONSUME3(RParen);
            }},
        ]));
        this.CONSUME1(RParen);
    });

    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    private fieldDeclaration = this.RULE('fieldDeclaration', () => {
        this.CONSUME(LParen);
        this.CONSUME(Field);
        this.CONSUME(Prime,   { LABEL: 'type'    });
        this.CONSUME(Literal, { LABEL: 'modulus' });
        this.CONSUME(RParen);
    });

    // GLOBAL CONSTANTS
    // --------------------------------------------------------------------------------------------
    private constantDeclaration = this.RULE('constantDeclaration', () => {
        this.CONSUME(LParen);
        this.CONSUME(Const);
        this.OR([
            { ALT: () => this.CONSUME(Literal,              { LABEL: 'value'  }) },
            { ALT: () => this.SUBRULE(this.literalVector,   { LABEL: 'vector' }) },
            { ALT: () => this.SUBRULE(this.literalMatrix,   { LABEL: 'matrix' }) }
        ]);
        this.CONSUME(RParen);
    });

    private literalVector = this.RULE('literalVector', () => {
        this.CONSUME(LParen);
        this.CONSUME(Vector);
        this.AT_LEAST_ONE(() => this.CONSUME(Literal,       { LABEL: 'elements' }));
        this.CONSUME(RParen);
    });

    private literalMatrix = this.RULE('literalMatrix', () => {
        this.CONSUME(LParen);
        this.CONSUME(Matrix);
        this.AT_LEAST_ONE(() => {
            this.SUBRULE(this.literalMatrixRow,             { LABEL: 'rows' });
        });
        this.CONSUME(RParen);
    });

    private literalMatrixRow = this.RULE('literalMatrixRow', () => {
        this.CONSUME(LParen);
        this.AT_LEAST_ONE(() => this.CONSUME(Literal,       { LABEL: 'elements' }));
        this.CONSUME(RParen);
    })

    // READONLY REGISTERS
    // --------------------------------------------------------------------------------------------
    private staticRegister = this.RULE('staticRegister', () => {
        this.CONSUME(LParen);
        this.CONSUME(Fixed);
        this.OR([
            { ALT: () => this.CONSUME(Repeat,           { LABEL: 'pattern' }) },
            { ALT: () => this.CONSUME(Spread,           { LABEL: 'pattern' }) }
        ]);
        this.OPTION(() => this.CONSUME(Binary,          { LABEL: 'binary'  }) );
        this.AT_LEAST_ONE(() => this.CONSUME(Literal,   { LABEL: 'values' }))
        this.CONSUME(RParen);
    });

    private inputRegister = this.RULE('inputRegister', () => {
        this.CONSUME(LParen);
        this.CONSUME(Input);
        this.OR([
            { ALT: () => this.CONSUME(Secret,           { LABEL: 'scope'   }) },
            { ALT: () => this.CONSUME(Public,           { LABEL: 'scope'   }) }
        ]);
        this.OPTION(() => this.CONSUME(Binary,          { LABEL: 'binary'  }) );
        this.CONSUME(RParen);
    });

    // TRANSITION SIGNATURE
    // --------------------------------------------------------------------------------------------
    private transitionSignature = this.RULE('transitionSignature', () => {
        this.CONSUME(LParen);
        this.CONSUME(Frame);
        this.CONSUME1(Literal, { LABEL: 'width'  });
        this.CONSUME2(Literal, { LABEL: 'span'   });
        this.CONSUME(RParen);
        this.MANY({
            GATE: this.BACKTRACK(this.localDeclaration),
            DEF : () => this.SUBRULE(this.localDeclaration, { LABEL: 'locals' })
        });
    });

    private localDeclaration = this.RULE('localDeclaration', () => {
        this.CONSUME(LParen);
        this.CONSUME(Local);
        this.OR([
            { ALT: () => this.CONSUME(Scalar,   { LABEL: 'type'     })},

            { ALT: () => {
                this.CONSUME(Vector,            { LABEL: 'type'     });
                this.CONSUME1(Literal,          { LABEL: 'length'   });
            }},
            { ALT: () => {
                this.CONSUME(Matrix,            { LABEL: 'type'     });
                this.CONSUME2(Literal,          { LABEL: 'rowCount' });
                this.CONSUME3(Literal,          { LABEL: 'colCount' });
            }}
        ]);
        this.CONSUME(RParen);
    });

    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    private expression = this.RULE('expression', () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.binaryOperation,     { LABEL: 'content' })},
            { ALT: () => this.SUBRULE(this.unaryExpression,     { LABEL: 'content' })},
            { ALT: () => this.SUBRULE(this.vectorExpression,    { LABEL: 'content' })},
            { ALT: () => this.SUBRULE(this.extractExpression,   { LABEL: 'content' })},
            { ALT: () => this.SUBRULE(this.sliceExpression,     { LABEL: 'content' })},
            { ALT: () => this.SUBRULE(this.matrixExpression,    { LABEL: 'content' })},
            { ALT: () => this.SUBRULE(this.loadExpression,      { LABEL: 'content' })},
            { ALT: () => this.SUBRULE(this.saveExpression,      { LABEL: 'content' })},
            { ALT: () => this.CONSUME(Literal,                  { LABEL: 'value'   })}
        ]);
    });

    private binaryOperation = this.RULE('binaryOperation', () => {
        this.CONSUME(LParen);
        this.CONSUME(BinaryOp,          { LABEL: 'operation' });
        this.SUBRULE1(this.expression,  { LABEL: 'lhs'       });
        this.SUBRULE2(this.expression,  { LABEL: 'rhs'       });
        this.CONSUME(RParen);
    });

    private unaryExpression = this.RULE('unaryExpression', () => {
        this.CONSUME(LParen);
        this.CONSUME(UnaryOp,          { LABEL: 'operation' });
        this.SUBRULE(this.expression,  { LABEL: 'operand'   });
        this.CONSUME(RParen);
    });

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    private vectorExpression = this.RULE('vectorExpression', () => {
        this.CONSUME(LParen);
        this.CONSUME(Vector);
        this.AT_LEAST_ONE(() => this.SUBRULE(this.expression, { LABEL: 'elements' }));
        this.CONSUME(RParen);
    });

    private extractExpression = this.RULE('extractExpression', () => {
        this.CONSUME(LParen);
        this.CONSUME(Get);
        this.SUBRULE(this.expression,   { LABEL: 'source' });
        this.CONSUME(Literal,           { LABEL: 'index'  });
        this.CONSUME(RParen);
    });

    private sliceExpression = this.RULE('sliceExpression', () => {
        this.CONSUME(LParen);
        this.CONSUME(Slice);
        this.SUBRULE(this.expression,   { LABEL: 'source' });
        this.CONSUME1(Literal,          { LABEL: 'start'  });
        this.CONSUME2(Literal,          { LABEL: 'end'    });
        this.CONSUME(RParen);
    });

    private matrixExpression = this.RULE('matrixExpression', () => {
        this.CONSUME(LParen);
        this.CONSUME(Matrix);
        this.AT_LEAST_ONE(() => this.SUBRULE(this.matrixRow,  { LABEL: 'rows' }));
        this.CONSUME(RParen);
    });

    private matrixRow = this.RULE('matrixRow', () => {
        this.CONSUME(LParen);
        this.AT_LEAST_ONE(() => this.SUBRULE(this.expression, { LABEL: 'elements' }));
        this.CONSUME(RParen);
    })

    // LOAD AND SAVE OPERATIONS
    // --------------------------------------------------------------------------------------------
    private loadExpression = this.RULE('loadExpression', () => {
        this.CONSUME(LParen);
        this.CONSUME(LoadOp,            { LABEL: 'operation' });
        this.CONSUME(Literal,           { LABEL: 'index'     });
        this.CONSUME(RParen);
    });

    private saveExpression = this.RULE('saveExpression', () => {
        this.CONSUME(LParen);
        this.CONSUME(SaveOp,            { LABEL: 'operation' });
        this.CONSUME(Literal,           { LABEL: 'index'     });
        this.SUBRULE(this.expression,   { LABEL: 'value'     });
        this.CONSUME(RParen);
    });
}

// EXPORT PARSER INSTANCE
// ================================================================================================
export const parser = new AirParser();