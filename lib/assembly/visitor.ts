// IMPORTS
// ================================================================================================
import { WasmOptions, FiniteField } from '@guildofweavers/air-script';
import { ModuleInfo, TransitionSignature } from './ModuleInfo';
import { parser } from './parser';
import { FieldDeclaration, StaticRegister, InputRegister, LocalVariable } from './declarations';
import {
    Expression, BinaryOperation, UnaryOperation, ConstantValue, LoadExpression, StoreExpression,
    ExtractExpression, SliceExpression, VectorExpression, MatrixExpression,
} from './expressions';

// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

class AirVisitor extends BaseCstVisitor {

    constructor() {
        super()
        this.validateVisitor()
    }

    // ENTRY POINT
    // --------------------------------------------------------------------------------------------
    module(ctx: any, wasmOptions?: WasmOptions): ModuleInfo {

        const field: FieldDeclaration = this.visit(ctx.field, wasmOptions);

        const constants: ConstantValue[] = (ctx.constants)
            ? ctx.constants.map((c: any) => this.visit(c))
            : [];

        const sRegisters: any[] = (ctx.staticRegisters)
            ? ctx.staticRegisters.map((r: any) => this.visit(r, field.field))
            : [];

        const iRegisters: any[] = (ctx.inputRegisters)
            ? ctx.inputRegisters.map((r: any) => this.visit(r))
            : [];

        const tFunctionSig = this.visit(ctx.tFunctionSignature);
        const tConstraintsSig = this.visit(ctx.tConstraintsSignature);
        const mi = new ModuleInfo(field, constants, sRegisters, iRegisters, tFunctionSig, tConstraintsSig);
        
        mi.transitionFunctionBody = {
            statements  : ctx.tFunctionBody ? ctx.tFunctionBody.map((s: any) => this.visit(s, mi)) : [],
            output      : this.visit(ctx.tFunctionReturn, mi)
        };
        mi.transitionConstraintsBody = {
            statements  : ctx.tConstraintsBody ? ctx.tConstraintsBody.map((s: any) => this.visit(s, mi)) : [],
            output      : this.visit(ctx.tConstraintsReturn, mi)
        };

        return mi;
    }

    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx: any, wasmOptions?: WasmOptions): FieldDeclaration { 
        const type: string = ctx.type[0].image;
        const modulus = BigInt(ctx.modulus[0].image);
        return new FieldDeclaration(type, modulus, wasmOptions);
    }

    // GLOBAL CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx: any): ConstantValue {
        const value: bigint | bigint[] | bigint[][] = (ctx.value)
            ? BigInt(ctx.value[0].image)
            : this.visit(ctx.vector || ctx.matrix);
        return new ConstantValue(value);
    }

    literalVector(ctx: any): bigint[] {
        return ctx.elements.map((e: any) => BigInt(e.image));
    }

    literalMatrix(ctx: any): bigint[][] {
        const result: bigint[][] = [];
        ctx.rows.forEach((row: any) => result.push(this.visit(row)));
        return result;
    }

    literalMatrixRow(ctx: any): bigint[] {
        return ctx.elements.map((e: any) => BigInt(e.image));
    }

    // READONLY REGISTERS
    // --------------------------------------------------------------------------------------------
    staticRegister(ctx: any, field: FiniteField): StaticRegister {
        const pattern = ctx.pattern[0].image;
        const binary = ctx.binary ? true : false;
        const values: bigint[] = ctx.values.map((v: any) => BigInt(v.image));
        return new StaticRegister(pattern, binary, values, field);
    }

    inputRegister(ctx: any): InputRegister {
        const secret = ctx.secret ? true : false;
        const binary = ctx.binary ? true : false;
        return new InputRegister(secret, binary);
    }

    // TRANSITION SIGNATURE
    // --------------------------------------------------------------------------------------------
    transitionSignature(ctx: any): TransitionSignature {
        const width = Number.parseInt(ctx.width[0].image, 10);
        const span = Number.parseInt(ctx.span[0].image, 10);
        const locals = (ctx.locals) ? ctx.locals.map((e: any) => this.visit(e)) : [];
        return { width, span, locals }
    }

    localDeclaration(ctx: any): LocalVariable {
        const type: string = ctx.type[0].image;
        
        if (type === 'scalar') {
            return new LocalVariable(0n);
        }
        else if (type === 'vector') {
            const length = Number.parseInt(ctx.length[0].image, 10);
            return new LocalVariable(new Array(length).fill(0n));
        }
        else if (type === 'matrix') {
            const rowCount = Number.parseInt(ctx.rowCount[0].image, 10);
            const colCount = Number.parseInt(ctx.colCount[0].image, 10);
            const rowDegree = new Array(colCount).fill(0n);
            return new LocalVariable(new Array(rowCount).fill(rowDegree));
        }
        else {
            throw new Error(`local variable type '${type}' is invalid`)
        }
    }

    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx: any, mi: ModuleInfo): Expression {
        if (ctx.content) {
            return this.visit(ctx.content, mi);
        }
        else {
            return new ConstantValue(BigInt(ctx.value[0].image));
        }
    }

    binaryOperation(ctx: any, mi: ModuleInfo): Expression { 
        const lhs: Expression = this.visit(ctx.lhs, mi);
        const rhs: Expression = this.visit(ctx.rhs, mi);
        return new BinaryOperation(ctx.operation[0].image, lhs, rhs);
    }

    unaryExpression(ctx: any, mi: ModuleInfo): Expression {
        const operand: Expression = this.visit(ctx.operand, mi);
        return new UnaryOperation(ctx.operation[0].image, operand);
    }    

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vectorExpression(ctx: any, mi: ModuleInfo): VectorExpression {
        const elements: Expression[] = ctx.elements.map((e: any) => this.visit(e, mi));
        return new VectorExpression(elements);
    }

    extractExpression(ctx: any, mi: ModuleInfo): ExtractExpression {
        const source: Expression = this.visit(ctx.source, mi);
        const index = Number.parseInt(ctx.index[0].image, 10);
        return new ExtractExpression(source, index);
    }

    sliceExpression(ctx: any, mi: ModuleInfo): SliceExpression {
        const source: Expression = this.visit(ctx.source, mi);
        const start = Number.parseInt(ctx.start[0].image, 10);
        const end = Number.parseInt(ctx.end[0].image, 10);
        return new SliceExpression(source, start, end);
    }

    matrixExpression(ctx: any, mi: ModuleInfo): MatrixExpression {
        const rows: Expression[][] = ctx.rows.map((r: any) => this.visit(r, mi));
        return new MatrixExpression(rows);
    }

    matrixRow(ctx: any, mi: ModuleInfo): Expression[] {
        return ctx.elements.map((e: any) => this.visit(e, mi));
    }

    // LOAD AND STORE OPERATIONS
    // --------------------------------------------------------------------------------------------
    loadExpression(ctx: any, mi: ModuleInfo): LoadExpression {
        const operation = ctx.operation[0].image;
        const index = Number.parseInt(ctx.index[0].image, 10);
        return mi.buildLoadExpression(operation, index);
    }

    storeExpression(ctx: any, mi: ModuleInfo): StoreExpression {
        const operation = ctx.operation[0].image;
        const index = Number.parseInt(ctx.index[0].image, 10);
        const value: Expression = this.visit(ctx.value, mi);
        return mi.buildStoreExpression(operation, index, value);
    }
}

// EXPORT VISITOR INSTANCE
// ================================================================================================
export const visitor = new AirVisitor();