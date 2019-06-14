"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const chevrotain_1 = require("chevrotain");
const parser_1 = require("./parser");
const lexer_1 = require("./lexer");
const utils_1 = require("./utils");
const operations_1 = require("./operations");
// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser_1.parser.getBaseCstVisitorConstructor();
class AirVisitor extends BaseCstVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }
    script(ctx) {
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
    transitionFunction(ctx) {
        const steps = ctx.steps[0].image;
        const blocks = [this.visit(ctx.blocks)];
        return {
            steps, blocks
        };
    }
    transitionConstraints(ctx) {
        return { test: 'tConstraints' };
    }
    statementBlock(ctx, cbc) {
        const variables = new Map();
        let code = '';
        for (let i = 0; i < ctx.statements.length; i++) {
            let statement = this.visit(ctx.statements[i], cbc);
            let variable = statement.variable;
            let expression = statement.expression;
            utils_1.validateVariableName(variable, expression.dimensions);
            cbc.setVariableDimensions(variable, expression.dimensions);
            code += `_${variable} = ${expression.code};\n`;
        }
        const out = this.visit(ctx.outStatement, cbc);
        code += `out = ${out.code};`; // TODO: don't hard-code 'out'
        return { variables, code };
    }
    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statement(ctx, cbc) {
        const variable = ctx.variableName[0].image;
        const expression = this.visit(ctx.expression, cbc);
        return { variable, expression };
    }
    outStatement(ctx, cbc) {
        return this.visit(ctx.expression, cbc);
    }
    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx, cbc) {
        const dimensions = [ctx.elements.length, 0];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], cbc);
            if (!utils_1.isScalar(element.dimensions))
                throw new Error('Vector elements must be scalars');
            code += `${element.code}, `;
        }
        code = code.slice(0, -2) + ']';
        return { dimensions, code };
    }
    matrix(ctx, cbc) {
        const rowCount = ctx.rows.length;
        let colCount = 0;
        let code = `[`;
        for (let i = 0; i < rowCount; i++) {
            let row = this.visit(ctx.rows[i], cbc);
            if (colCount === 0) {
                colCount = row.dimensions[0];
            }
            else if (colCount !== row.dimensions[0]) {
                throw new Error('All matrix rows must have the same number of columns');
            }
            code += `${row.code}, `;
        }
        code = code.slice(0, -2) + ']';
        return { dimensions: [rowCount, colCount], code };
    }
    matrixRow(ctx, cbc) {
        const dimensions = [ctx.elements.length, 0];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], cbc);
            if (!utils_1.isScalar(element.dimensions))
                throw new Error('Matrix elements must be scalars');
            code += `${element.code}, `;
        }
        code = code.slice(0, -2) + ']';
        return { dimensions, code };
    }
    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx, cbc) {
        return this.visit(ctx.addExpression, cbc);
    }
    addExpression(ctx, cbc) {
        let result = this.visit(ctx.lhs, cbc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, cbc);
                let opHandler = operations_1.getOperationHandler(ctx.AddOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }
        return result;
    }
    mulExpression(ctx, cbc) {
        let result = this.visit(ctx.lhs, cbc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, cbc);
                let opHandler = operations_1.getOperationHandler(ctx.MulOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }
        return result;
    }
    expExpression(ctx, cbc) {
        let result = this.visit(ctx.lhs, cbc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, cbc);
                let opHandler = operations_1.getOperationHandler(ctx.ExpOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }
        return result;
    }
    atomicExpression(ctx, cbc) {
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
            return { code: cbc.buildRegisterReference(register), dimensions: [0, 0] };
        }
        else if (ctx.ReadonlyRegister) {
            const register = ctx.ReadonlyRegister[0].image;
            return { code: cbc.buildRegisterReference(register), dimensions: [0, 0] };
        }
        else if (ctx.IntegerLiteral) {
            const value = ctx.IntegerLiteral[0].image;
            return { code: `${value}n`, dimensions: [0, 0] };
        }
        else {
            throw new Error('Invalid atomic expression'); // TODO: better error
        }
    }
    negExpression(ctx) {
        return `-${this.visit(ctx.expression)}`;
    }
    parenExpression(ctx) {
        return this.visit(ctx.expression);
    }
    // LITERAL EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    literalExpression(ctx) {
        return this.visit(ctx.literalAddExpression);
    }
    literalAddExpression(ctx) {
        let result = this.visit(ctx.lhs);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhsValue = this.visit(rhsOperand);
                let operator = ctx.AddOp[i];
                if (chevrotain_1.tokenMatcher(operator, lexer_1.Plus)) {
                    result = `field.add(${result}, ${rhsValue})`;
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Minus)) {
                    result = `field.sub(${result}, ${rhsValue})`;
                }
            });
        }
        return result;
    }
    literalMulExpression(ctx) {
        let result = this.visit(ctx.lhs);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhsValue = this.visit(rhsOperand);
                let operator = ctx.MulOp[i];
                if (chevrotain_1.tokenMatcher(operator, lexer_1.Star)) {
                    result = `field.mul(${result}, ${rhsValue})`;
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Slash)) {
                    result = `field.div(${result}, ${rhsValue})`;
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Pound)) {
                    result = `field.prod(${result}, ${rhsValue})`;
                }
            });
        }
        return result;
    }
    literalExpExpression(ctx) {
        let result = this.visit(ctx.lhs);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhsValue = this.visit(rhsOperand);
                result = `field.exp(${result}, ${rhsValue})`;
            });
        }
        return result;
    }
    literalAtomicExpression(ctx) {
        if (ctx.literalParenExpression) {
            return this.visit(ctx.literalParenExpression);
        }
        else if (ctx.IntegerLiteral) {
            return ctx.IntegerLiteral[0].image;
        }
    }
    literalParenExpression(ctx) {
        return this.visit(ctx.literalExpression);
    }
}
// EXPORT VISITOR INSTANCE
// ================================================================================================
exports.visitor = new AirVisitor();
//# sourceMappingURL=visitor.js.map