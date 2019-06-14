// IMPORTS
// ================================================================================================
import { tokenMatcher } from 'chevrotain';
import { parser } from './parser';
import { Plus, Star, Slash, Pound, Minus } from './lexer';
import { Dimensions, StatementBlockContext, validateVariableName, isScalar } from './utils';
import { getOperationHandler } from './operations';

// INTERFACES
// ================================================================================================
export interface Statement {
    variable    : string;
    expression  : Expression;
}

export interface Expression {
    code        : string;
    dimensions  : Dimensions;
}

// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

class AirVisitor extends BaseCstVisitor {

    constructor() {
        super()
        this.validateVisitor()
    }

    script(ctx: any) {
        const starkName = ctx.starkName[0].image;
        const modulus = ctx.modulus[0].image;
        const tFunction = this.visit(ctx.tFunction);
        const tConstraints = this.visit(ctx.tConstraints);

        return {
            starkName,
            modulus,
            tFunction,
            tConstraints
        };
    }

    transitionFunction(ctx: any) {
        const steps = ctx.steps[0].image;
        const blocks = [this.visit(ctx.blocks)];

        return {
            steps, blocks
        };
    }

    transitionConstraints(ctx: any) {
        return { test: 'tConstraints' };
    }

    statementBlock(ctx: any, cbc: StatementBlockContext) {

        const variables = new Map<string,Dimensions>();
        let code = '';

        for (let i = 0; i < ctx.statements.length; i++) {
            let statement: Statement = this.visit(ctx.statements[i], cbc);
            let variable = statement.variable;
            let expression = statement.expression;
            validateVariableName(variable, expression.dimensions);
            cbc.setVariableDimensions(variable, expression.dimensions);
            code += `_${variable} = ${expression.code};\n`;
        }

        const out: Expression = this.visit(ctx.outStatement, cbc);
        code += `out = ${out.code};`; // TODO: don't hard-code 'out'
        
        return { variables, code };
    }

    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statement(ctx: any, cbc: StatementBlockContext): Statement {
        const variable = ctx.variableName[0].image;
        const expression = this.visit(ctx.expression, cbc);
        return { variable, expression };
    }

    outStatement(ctx: any, cbc: StatementBlockContext): Expression {
        return this.visit(ctx.expression, cbc);
    }

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx: any, cbc: StatementBlockContext): Expression {

        const dimensions: Dimensions = [ctx.elements.length, 0];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element: Expression = this.visit(ctx.elements[i], cbc);
            if (!isScalar(element.dimensions)) throw new Error('Vector elements must be scalars');
            code += `${element.code}, `;
        }
        code = code.slice(0, -2) + ']';

        return { dimensions, code };
    }

    matrix(ctx: any, cbc: StatementBlockContext): Expression {

        const rowCount = ctx.rows.length;
        let colCount = 0;

        let code = `[`;
        for (let i = 0; i < rowCount; i++) {
            let row: Expression = this.visit(ctx.rows[i], cbc);
            if (colCount === 0) {
                colCount = row.dimensions[0];
            }
            else if (colCount !== row.dimensions[0]) {
                throw new Error('All matrix rows must have the same number of columns')
            }
            code += `${row.code}, `;
        }
        code = code.slice(0, -2) + ']';

        return { dimensions: [rowCount, colCount], code };
    }

    matrixRow(ctx: any, cbc: StatementBlockContext): Expression {

        const dimensions: Dimensions = [ctx.elements.length, 0];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], cbc);
            if (!isScalar(element.dimensions)) throw new Error('Matrix elements must be scalars');
            code += `${element.code}, `;
        }
        code = code.slice(0, -2) + ']';

        return { dimensions, code };
    }

    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx: any, cbc: StatementBlockContext): Expression {
        return this.visit(ctx.addExpression, cbc);
    }

    addExpression(ctx: any, cbc: StatementBlockContext): Expression {
        let result: Expression = this.visit(ctx.lhs, cbc);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, cbc);
                let opHandler = getOperationHandler(ctx.AddOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }

        return result;
    }

    mulExpression(ctx: any, cbc: StatementBlockContext): Expression {
        let result: Expression = this.visit(ctx.lhs, cbc);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, cbc);
                let opHandler = getOperationHandler(ctx.MulOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }

        return result;
    }

    expExpression(ctx: any, cbc: StatementBlockContext): Expression {
        let result: Expression = this.visit(ctx.lhs, cbc);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, cbc);
                let opHandler = getOperationHandler(ctx.ExpOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }

        return result;
    }

    atomicExpression(ctx: any, cbc: StatementBlockContext): Expression {
        if (ctx.parenExpression) {
            return this.visit(ctx.parenExpression);
        }
        else if (ctx.negExpression) {
            return this.visit(ctx.negExpression);
        }
        else if (ctx.Identifier) {
            const variable = ctx.Identifier[0].image;
            const dimensions = cbc.getVariableDimensions(variable);
            if (!dimensions) {
                throw new Error(`Variable '${variable}' is not defined`);
            }
            return { code: `_${variable}`, dimensions };
        }
        else if (ctx.MutableRegister) {
            const register = ctx.MutableRegister[0].image;
            return { code: cbc.buildRegisterReference(register), dimensions: [0,0] };
        }
        else if (ctx.ReadonlyRegister) {
            const register = ctx.ReadonlyRegister[0].image;
            return { code: cbc.buildRegisterReference(register), dimensions: [0,0] };
        }
        else if (ctx.IntegerLiteral) {
            const value = ctx.IntegerLiteral[0].image;
            return { code: `${value}n`, dimensions: [0,0] };
        }
        else {
            throw new Error('Invalid atomic expression'); // TODO: better error
        }
    }

    negExpression(ctx: any) {
        return `-${this.visit(ctx.expression)}`;
    }

    parenExpression(ctx: any) {
        return this.visit(ctx.expression);
    }

    // LITERAL EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    literalExpression(ctx: any) {
        return this.visit(ctx.literalAddExpression);
    }

    literalAddExpression(ctx: any) {
        let result = this.visit(ctx.lhs);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhsValue = this.visit(rhsOperand)
                let operator = ctx.AddOp[i];

                if (tokenMatcher(operator, Plus)) {
                    result = `field.add(${result}, ${rhsValue})`;
                }
                else if (tokenMatcher(operator, Minus)) {
                    result = `field.sub(${result}, ${rhsValue})`;
                }
            });
        }

        return result;
    }

    literalMulExpression(ctx: any) {
        let result = this.visit(ctx.lhs);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhsValue = this.visit(rhsOperand)
                let operator = ctx.MulOp[i];

                if (tokenMatcher(operator, Star)) {
                    result = `field.mul(${result}, ${rhsValue})`;
                }
                else if (tokenMatcher(operator, Slash)) {
                    result = `field.div(${result}, ${rhsValue})`;
                }
                else if (tokenMatcher(operator, Pound)) {
                    result = `field.prod(${result}, ${rhsValue})`;
                }
            });
        }

        return result;
    }

    literalExpExpression(ctx: any) {
        let result = this.visit(ctx.lhs);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhsValue = this.visit(rhsOperand);
                result = `field.exp(${result}, ${rhsValue})`;
            });
        }

        return result;
    }

    literalAtomicExpression(ctx: any) {
        if (ctx.literalParenExpression) {
            return this.visit(ctx.literalParenExpression);
        }
        else if (ctx.IntegerLiteral) {
            return ctx.IntegerLiteral[0].image;
        }
    }

    literalParenExpression(ctx: any) {
        return this.visit(ctx.literalExpression);
    }
}

// EXPORT VISITOR INSTANCE
// ================================================================================================
export const visitor = new AirVisitor();