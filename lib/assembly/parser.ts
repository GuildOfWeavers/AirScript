// IMPORTS
// ================================================================================================
import { CstParser } from "chevrotain";
import {
    allTokens, LParen, RParen, Module, Field, Literal, Prime, Const, Vector, Matrix, Fixed, Repeat,
    Spread, Binary, Frame, Scalar, Local, Get, Slice, BinaryOp, UnaryOp, LoadOp, SaveOp, Transition, Evaluation
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
        this.CONSUME(LParen);
        this.CONSUME(Module);
        this.SUBRULE(this.fieldDeclaration,                       { LABEL: 'field'                 });
        this.MANY(() => this.OR([
            { ALT: () => this.SUBRULE(this.constantDeclaration,   { LABEL: 'constants'             })},
            { ALT: () => this.SUBRULE(this.staticRegister,        { LABEL: 'staticRegisters'       })},
            { ALT: () => this.SUBRULE(this.transitionFunction,    { LABEL: 'transitionFunction'    })},
            { ALT: () => this.SUBRULE(this.transitionConstraints, { LABEL: 'transitionConstraints' })},
        ]));
        this.CONSUME(RParen);
    });

    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    private fieldDeclaration = this.RULE('fieldDeclaration', () => {
        this.CONSUME(LParen);
        this.CONSUME(Field);
        this.CONSUME(Prime);
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

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    private transitionFunction = this.RULE('transitionFunction', () => {
        this.CONSUME(LParen);
        this.CONSUME(Transition);
        this.SUBRULE(this.executionFrame,                       { LABEL: 'frame'  });
        this.MANY(() => this.SUBRULE(this.localDeclaration,     { LABEL: 'locals' }));
        this.AT_LEAST_ONE(() => this.SUBRULE(this.expression,   { LABEL: 'body' }));
        this.CONSUME(RParen);
    });

    private transitionConstraints = this.RULE('transitionConstraints', () => {
        this.CONSUME(LParen);
        this.CONSUME(Evaluation);
        this.SUBRULE(this.executionFrame,                       { LABEL: 'frame'  });
        this.MANY(() => this.SUBRULE(this.localDeclaration,     { LABEL: 'locals' }));
        this.AT_LEAST_ONE(() => this.SUBRULE(this.expression,   { LABEL: 'body'   }));
        this.CONSUME(RParen);
    });

    private executionFrame = this.RULE('executionFrame', () => {
        this.CONSUME(LParen);
        this.CONSUME(Frame);
        this.CONSUME1(Literal, { LABEL: 'width'  });
        this.CONSUME2(Literal, { LABEL: 'height' });
        this.CONSUME(RParen);
    });

    private localDeclaration = this.RULE('localDeclaration', () => {
        this.CONSUME(LParen);
        this.CONSUME(Local);
        this.OR([
            { ALT: () => this.CONSUME(Scalar,     { LABEL: 'type'     })},
            { ALT: () => this.CONSUME(Vector,     { LABEL: 'type'     })},
            { ALT: () => this.CONSUME(Matrix,     { LABEL: 'type'     })}
        ]);
        this.OPTION1(() => this.CONSUME1(Literal, { LABEL: 'rowCount' }));
        this.OPTION2(() => this.CONSUME2(Literal, { LABEL: 'colCount' }));
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
        this.CONSUME(RParen);
    });
}

// EXPORT PARSER INSTANCE
// ================================================================================================
export const parser = new AirParser();