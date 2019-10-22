"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chevrotain_1 = require("chevrotain");
const parser_1 = require("./parser");
const lexer_1 = require("./lexer");
const expressions_1 = require("./expressions");
// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser_1.parser.getBaseCstVisitorConstructor();
class AirVisitor extends BaseCstVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }
    // ENTRY POINT
    // --------------------------------------------------------------------------------------------
    module(ctx, config) {
        const constants = (ctx.constants)
            ? ctx.constants.map((c) => this.visit(c))
            : [];
        const tConstraints = this.visit(ctx.transitionConstraints);
        const x = constants;
    }
    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx) { }
    // GLOBAL CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx) {
        const value = (ctx.value)
            ? BigInt(ctx.value[0].image)
            : this.visit(ctx.vector || ctx.matrix);
        return new expressions_1.ConstantValue(value);
    }
    literalVector(ctx) {
        const vector = new Array(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            vector[i] = BigInt(ctx.elements[i].image);
        }
        return vector;
    }
    literalMatrix(ctx) {
        const result = [];
        for (let i = 0; i < ctx.rows.length; i++) {
            result.push(this.visit(ctx.rows[i]));
        }
        return result;
    }
    literalMatrixRow(ctx) {
        const row = new Array(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            row[i] = BigInt(ctx.elements[i].image);
        }
        return row;
    }
    // READONLY REGISTERS
    // --------------------------------------------------------------------------------------------
    staticRegister(ctx) { }
    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx) { }
    transitionConstraints(ctx) {
        const body = this.visit(ctx.body);
    }
    executionFrame(ctx) {
    }
    localDeclaration(ctx) { }
    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx) {
        if (ctx.content) {
            return this.visit(ctx.content);
        }
        else {
            return new expressions_1.ConstantValue(BigInt(ctx.value[0].image));
        }
    }
    binaryOperation(ctx) {
        const lhs = this.visit(ctx.lhs);
        const rhs = this.visit(ctx.rhs);
        const opToken = ctx.operation[0];
        let result;
        if (chevrotain_1.tokenMatcher(opToken, lexer_1.Add))
            result = expressions_1.BinaryOperation.add(lhs, rhs);
        else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Sub))
            result = expressions_1.BinaryOperation.sub(lhs, rhs);
        else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Mul))
            result = expressions_1.BinaryOperation.mul(lhs, rhs);
        else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Div))
            result = expressions_1.BinaryOperation.div(lhs, rhs);
        else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Exp))
            result = expressions_1.BinaryOperation.exp(lhs, rhs);
        else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Prod))
            result = expressions_1.BinaryOperation.exp(lhs, rhs);
        else
            throw new Error(`Invalid operator '${opToken.image}'`);
        return result;
    }
    unaryExpression(ctx) {
        const operand = this.visit(ctx.operand);
        const opToken = ctx.operation[0];
        let result;
        if (chevrotain_1.tokenMatcher(opToken, lexer_1.Neg))
            result = expressions_1.UnaryOperation.neg(operand);
        else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Inv))
            result = expressions_1.UnaryOperation.inv(operand);
        else
            throw new Error(`Invalid operator '${opToken.image}'`);
        return result;
    }
    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vectorExpression(ctx) { }
    extractExpression(ctx) {
        const source = this.visit(ctx.source);
        const index = Number.parseInt(ctx.index[0].image, 10);
        return new expressions_1.ExtractExpression(source, index);
    }
    sliceExpression(ctx) {
        const source = this.visit(ctx.source);
        const start = Number.parseInt(ctx.start[0].image, 10);
        const end = Number.parseInt(ctx.end[0].image, 10);
        return new expressions_1.SliceExpression(source, start, end);
    }
    matrixExpression(ctx) { }
    matrixRow(ctx) { }
    // LOAD AND SAVE OPERATIONS
    // --------------------------------------------------------------------------------------------
    loadExpression(ctx) {
        const operation = ctx.operation[0].image;
        const index = Number.parseInt(ctx.index[0].image, 10);
        const result = new expressions_1.LoadOperation(operation, index, new expressions_1.NoopExpression([8, 0], new Array(8).fill(1n)));
        return result;
    }
    saveExpression(ctx) { }
}
// EXPORT VISITOR INSTANCE
// ================================================================================================
exports.visitor = new AirVisitor();
//# sourceMappingURL=visitor.js.map