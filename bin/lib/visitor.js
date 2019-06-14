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
    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx, cbc) {
        const variables = new Map();
        let code = '';
        for (let i = 0; i < ctx.statements.length; i++) {
            let statement = this.visit(ctx.statements[i], cbc);
            let variable = statement.variable;
            let expression = statement.expression;
            utils_1.validateVariableName(variable, expression.dimensions);
            cbc.setVariableDimensions(variable, expression.dimensions);
            code += `$${variable} = ${expression.code};\n`;
        }
        // TODO: validate out statement dimensions
        const out = this.visit(ctx.outStatement, cbc);
        code += out.code;
        return { variables, code };
    }
    statement(ctx, cbc) {
        const variable = ctx.variableName[0].image;
        const expression = this.visit(ctx.expression, cbc);
        return { variable, expression };
    }
    outStatement(ctx, cbc) {
        let code = '', dimensions;
        if (ctx.expression) {
            const expression = this.visit(ctx.expression, cbc);
            if (utils_1.isScalar(expression.dimensions)) {
                code = `out[0] = ${expression.code};\n`;
                dimensions = [1, 0];
            }
            else if (utils_1.isVector(expression.dimensions)) {
                dimensions = expression.dimensions;
                code = `_out = ${expression.code};\n`;
                for (let i = 0; i < dimensions[0]; i++) {
                    code += `out[${i}] = _out[${i}];\n`;
                }
            }
            else {
                throw new Error('Out statement must evaluate either to a scalar or to a vector');
            }
        }
        else {
            dimensions = [ctx.expressions.length, 0];
            for (let i = 0; i < ctx.expressions.length; i++) {
                let expression = this.visit(ctx.expressions[i], cbc);
                if (!utils_1.isScalar(expression.dimensions)) {
                    throw new Error(`Out vector elements must be scalars`);
                }
                code += `out[${i}] = ${expression.code};\n`;
            }
        }
        return { code, dimensions };
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
        else if (ctx.Identifier) {
            const variable = ctx.Identifier[0].image;
            const dimensions = cbc.getVariableDimensions(variable);
            if (!dimensions) {
                throw new Error(`Variable '${variable}' is not defined`);
            }
            return { code: `$${variable}`, dimensions };
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
                    result = result + rhsValue;
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Minus)) {
                    result = result - rhsValue;
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
                    result = result * rhsValue;
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Slash)) {
                    result = result / rhsValue;
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Pound)) {
                    throw new Error('Matrix multiplication is supported for literal expressions');
                }
            });
        }
        return result;
    }
    literalExpExpression(ctx) {
        let result = this.visit(ctx.lhs);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand) => {
                let rhsValue = this.visit(rhsOperand);
                result = result ** rhsValue;
            });
        }
        return result;
    }
    literalAtomicExpression(ctx) {
        if (ctx.literalParenExpression) {
            return this.visit(ctx.literalParenExpression);
        }
        else if (ctx.IntegerLiteral) {
            return BigInt(ctx.IntegerLiteral[0].image);
        }
        else {
            throw new Error('Invalid atomic expression'); // TODO: better error
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