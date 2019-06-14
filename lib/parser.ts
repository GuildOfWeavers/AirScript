// IMPORTS
// ================================================================================================
import { CstParser } from "chevrotain";
import { allTokens, Identifier,
    Define, Over, Prime, Field, LParen, RParen, IntegerLiteral, LCurly, RCurly, ExpOp, MulOp, AddOp,
    Transition, Registers, In, Steps, Enforce, Constraints, Of, Degree, Colon, Semicolon, Out, 
    MutableRegister, ReadonlyRegister, Minus, LSquare, RSquare, Comma
} from './lexer';

// PARSER DEFINITION
// ================================================================================================
class AirParser extends CstParser {
    constructor() {
        super(allTokens);
        this.performSelfAnalysis();
    }

    public script = this.RULE('script', () => {
        this.CONSUME(Define);
        this.CONSUME(Identifier, { LABEL: 'starkName' });
        this.CONSUME(Over);
        this.CONSUME(Prime);
        this.CONSUME(Field);
        this.CONSUME(IntegerLiteral, { LABEL: 'modulus' })
        this.CONSUME(LCurly);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.SUBRULE(this.transitionFunction, { LABEL: 'tFunction' }) },
                { ALT: () => this.SUBRULE(this.transitionConstraints, { LABEL: 'tConstraints' }) }
            ]);
        });
        this.CONSUME(RCurly);
    });

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    private transitionFunction = this.RULE('transitionFunction', () => {
        this.CONSUME(Transition);
        this.CONSUME(IntegerLiteral, { LABEL: 'registerCount' });
        this.CONSUME(Registers);
        this.CONSUME(In);
        this.CONSUME2(IntegerLiteral, { LABEL: 'steps' });
        this.CONSUME(Steps);
        this.CONSUME(LCurly);
        this.SUBRULE(this.statementBlock, { LABEL: 'statements' });
        this.CONSUME(RCurly);
    });

    private transitionConstraints = this.RULE('transitionConstraints', () => {
        this.CONSUME(Enforce);
        this.CONSUME(IntegerLiteral, { LABEL: 'constraintCount' });
        this.CONSUME(Constraints);
        this.CONSUME(Of);
        this.CONSUME(Degree);
        this.CONSUME2(IntegerLiteral, { LABEL: 'constraintDegree' });
        this.CONSUME(LCurly);
        this.SUBRULE(this.statementBlock, { LABEL: 'statements' });
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
        this.CONSUME(Out);
        this.CONSUME(Colon);
        this.OR([
            { ALT: () => this.SUBRULE(this.expression,  { LABEL: 'expression' }) },
            { ALT: () => {
                this.CONSUME(LSquare);
                this.AT_LEAST_ONE_SEP({
                    SEP : Comma,
                    DEF : () => this.SUBRULE2(this.expression, { LABEL: 'expressions' })
                })
                this.CONSUME(RSquare);
            }}
        ]);
        this.CONSUME(Semicolon);
    });

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    private vector = this.RULE('vector', () => {
        this.CONSUME(LSquare);
        this.AT_LEAST_ONE_SEP({
            SEP : Comma,
            DEF : () => this.SUBRULE(this.expression, { LABEL: 'elements' })
        })
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
            { ALT: () => this.SUBRULE(this.parenExpression) },
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(MutableRegister) },
            { ALT: () => this.CONSUME(ReadonlyRegister) },
            { ALT: () => this.CONSUME(IntegerLiteral) }
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