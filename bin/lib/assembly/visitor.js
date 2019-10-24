"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ModuleInfo_1 = require("./ModuleInfo");
const parser_1 = require("./parser");
const declarations_1 = require("./declarations");
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
        const field = this.visit(ctx.field, config.wasmOptions);
        const constants = (ctx.constants)
            ? ctx.constants.map((c) => this.visit(c))
            : [];
        const sRegisters = (ctx.staticRegisters)
            ? ctx.staticRegisters.map((r) => this.visit(r, field.field))
            : [];
        const iRegisters = (ctx.inputRegisters)
            ? ctx.inputRegisters.map((r) => this.visit(r))
            : [];
        const tFunctionSig = this.visit(ctx.tFunctionSignature);
        const tConstraintsSig = this.visit(ctx.tConstraintsSignature);
        const mi = new ModuleInfo_1.ModuleInfo(field, constants, sRegisters, iRegisters, tFunctionSig, tConstraintsSig);
        mi.transitionFunctionBody = {
            statements: ctx.tFunctionBody ? ctx.tFunctionBody.map((s) => this.visit(s, mi)) : [],
            output: this.visit(ctx.tFunctionReturn, mi)
        };
        mi.transitionConstraintsBody = {
            statements: ctx.tConstraintsBody ? ctx.tConstraintsBody.map((s) => this.visit(s, mi)) : [],
            output: this.visit(ctx.tConstraintsReturn, mi)
        };
        return mi;
    }
    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx, wasmOptions) {
        const type = ctx.type[0].image;
        const modulus = BigInt(ctx.modulus[0].image);
        return new declarations_1.FieldDeclaration(type, modulus, wasmOptions);
    }
    // GLOBAL CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx) {
        const value = (ctx.value)
            ? BigInt(ctx.value[0].image)
            : this.visit(ctx.vector || ctx.matrix);
        return new expressions_1.ConstantValue(value);
    }
    literalVector(ctx) {
        return ctx.elements.map((e) => BigInt(e.image));
    }
    literalMatrix(ctx) {
        const result = [];
        ctx.rows.forEach((row) => result.push(this.visit(row)));
        return result;
    }
    literalMatrixRow(ctx) {
        return ctx.elements.map((e) => BigInt(e.image));
    }
    // READONLY REGISTERS
    // --------------------------------------------------------------------------------------------
    staticRegister(ctx, field) {
        const pattern = ctx.pattern[0].image;
        const binary = ctx.binary ? true : false;
        const values = ctx.values.map((v) => BigInt(v.image));
        return new declarations_1.StaticRegister(pattern, binary, values, field);
    }
    inputRegister(ctx) {
        const secret = ctx.secret ? true : false;
        const binary = ctx.binary ? true : false;
        return new declarations_1.InputRegister(secret, binary);
    }
    // TRANSITION SIGNATURE
    // --------------------------------------------------------------------------------------------
    transitionSignature(ctx) {
        const width = Number.parseInt(ctx.width[0].image, 10);
        const span = Number.parseInt(ctx.span[0].image, 10);
        const locals = (ctx.locals) ? ctx.locals.map((e) => this.visit(e)) : [];
        return { width, span, locals };
    }
    localDeclaration(ctx) {
        const type = ctx.type[0].image;
        if (type === 'scalar') {
            return new declarations_1.LocalVariable(0n);
        }
        else if (type === 'vector') {
            const length = Number.parseInt(ctx.length[0].image, 10);
            return new declarations_1.LocalVariable(new Array(length).fill(0n));
        }
        else if (type === 'matrix') {
            const rowCount = Number.parseInt(ctx.rowCount[0].image, 10);
            const colCount = Number.parseInt(ctx.colCount[0].image, 10);
            const rowDegree = new Array(colCount).fill(0n);
            return new declarations_1.LocalVariable(new Array(rowCount).fill(rowDegree));
        }
        else {
            throw new Error(`local variable type '${type}' is invalid`);
        }
    }
    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx, mi) {
        if (ctx.content) {
            return this.visit(ctx.content, mi);
        }
        else {
            return new expressions_1.ConstantValue(BigInt(ctx.value[0].image));
        }
    }
    binaryOperation(ctx, mi) {
        const lhs = this.visit(ctx.lhs, mi);
        const rhs = this.visit(ctx.rhs, mi);
        return new expressions_1.BinaryOperation(ctx.operation[0].image, lhs, rhs);
    }
    unaryExpression(ctx, mi) {
        const operand = this.visit(ctx.operand, mi);
        return new expressions_1.UnaryOperation(ctx.operation[0].image, operand);
    }
    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vectorExpression(ctx, mi) {
        const elements = ctx.elements.map((e) => this.visit(e, mi));
        return new expressions_1.VectorExpression(elements);
    }
    extractExpression(ctx, mi) {
        const source = this.visit(ctx.source, mi);
        const index = Number.parseInt(ctx.index[0].image, 10);
        return new expressions_1.ExtractExpression(source, index);
    }
    sliceExpression(ctx, mi) {
        const source = this.visit(ctx.source, mi);
        const start = Number.parseInt(ctx.start[0].image, 10);
        const end = Number.parseInt(ctx.end[0].image, 10);
        return new expressions_1.SliceExpression(source, start, end);
    }
    matrixExpression(ctx, mi) {
        const rows = ctx.rows.map((r) => this.visit(r, mi));
        return new expressions_1.MatrixExpression(rows);
    }
    matrixRow(ctx, mi) {
        return ctx.elements.map((e) => this.visit(e, mi));
    }
    // LOAD AND STORE OPERATIONS
    // --------------------------------------------------------------------------------------------
    loadExpression(ctx, mi) {
        const operation = ctx.operation[0].image;
        const index = Number.parseInt(ctx.index[0].image, 10);
        return mi.buildLoadExpression(operation, index);
    }
    storeExpression(ctx, mi) {
        const operation = ctx.operation[0].image;
        const index = Number.parseInt(ctx.index[0].image, 10);
        const value = this.visit(ctx.value, mi);
        return mi.buildStoreExpression(operation, index, value);
    }
}
// EXPORT VISITOR INSTANCE
// ================================================================================================
exports.visitor = new AirVisitor();
//# sourceMappingURL=visitor.js.map