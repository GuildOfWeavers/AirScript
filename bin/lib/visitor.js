"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const galois_1 = require("@guildofweavers/galois");
const chevrotain_1 = require("chevrotain");
const parser_1 = require("./parser");
const lexer_1 = require("./lexer");
const operations_1 = require("./operations");
const utils_1 = require("./utils");
// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser_1.parser.getBaseCstVisitorConstructor();
class AirVisitor extends BaseCstVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }
    script(ctx, limits) {
        const starkName = ctx.starkName[0].image;
        const modulus = this.visit(ctx.modulus);
        const field = new galois_1.PrimeField(modulus);
        // parse constants
        const globalConstants = {};
        const globalConstantMap = new Map();
        if (ctx.constants) {
            for (let i = 0; i < ctx.constants.length; i++) {
                let constant = this.visit(ctx.constants[i]);
                globalConstants[constant.name] = constant.value;
                // TODO: check for duplicates
                globalConstantMap.set(constant.name, constant.dimensions);
            }
        }
        // TODO: parse readonly registers
        const readonlyRegisters = [];
        const tFunction = this.visit(ctx.tFunction, limits);
        const tConstraints = this.visit(ctx.tConstraints, limits);
        return {
            name: starkName,
            field: field,
            steps: tFunction.steps,
            registerCount: tFunction.registerCount,
            constraintCount: tConstraints.constraintCount,
            transitionFunction: tFunction.transitionFunction,
            constraintEvaluator: tConstraints.constraintEvaluator,
            maxConstraintDegree: tConstraints.maxConstraintDegree,
            readonlyRegisters: readonlyRegisters,
            globalConstants: globalConstants
        };
    }
    // GLOBAL CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx) {
        const name = ctx.constantName[0].image;
        let value;
        let dimensions;
        if (ctx.value) {
            value = this.visit(ctx.value);
            dimensions = [0, 0];
        }
        else if (ctx.vector) {
            value = this.visit(ctx.vector);
            dimensions = [value.length, 0];
        }
        else if (ctx.matrix) {
            value = this.visit(ctx.matrix);
            dimensions = [value.length, value[0].length];
        }
        else {
            throw new Error('Invalid constant declaration'); // TODO: better error
        }
        // TODO: validate variable name
        return { name, value, dimensions };
    }
    literalVector(ctx) {
        const vector = new Array(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i]);
            vector[i] = element;
        }
        return vector;
    }
    literalMatrix(ctx) {
        let colCount = 0;
        const rowCount = ctx.rows.length;
        const matrix = new Array(rowCount);
        for (let i = 0; i < rowCount; i++) {
            let row = this.visit(ctx.rows[i]);
            if (colCount === 0) {
                colCount = row.length;
            }
            else if (colCount !== row.length) {
                throw new Error('All matrix rows must have the same number of columns');
            }
            matrix[i] = row;
        }
        return matrix;
    }
    literalMatrixRow(ctx) {
        const row = new Array(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i]);
            row[i] = element;
        }
        return row;
    }
    // READONLY REGISTERS
    // --------------------------------------------------------------------------------------------
    readonlyRegisters(ctx) {
    }
    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx, limits) {
        const steps = ctx.steps[0].image;
        const blocks = [this.visit(ctx.blocks)];
        return {
            steps, blocks
        };
    }
    transitionConstraints(ctx, limits) {
        return { test: 'tConstraints' };
    }
    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx, cbc) {
        let code = '';
        for (let i = 0; i < ctx.statements.length; i++) {
            let statement = this.visit(ctx.statements[i], cbc);
            let variable = statement.variable;
            let expression = statement.expression;
            cbc.setVariableDimensions(variable, expression.dimensions);
            code += `$${variable} = ${expression.code};\n`;
        }
        const out = this.visit(ctx.outStatement, cbc);
        code += out.code;
        return { code, dimensions: out.dimensions };
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