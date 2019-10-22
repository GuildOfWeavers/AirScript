// IMPORTS
// ================================================================================================
import { StarkLimits, InputRegisterSpecs, StaticRegisterSpecs } from '@guildofweavers/air-script';
import { FiniteField, createPrimeField, WasmOptions } from '@guildofweavers/galois';
import { tokenMatcher } from 'chevrotain';
import { parser } from './parser';
import { Add, Sub, Mul, Div, Exp, Prod, Neg, Inv } from './lexer';
import {
    Expression, BinaryOperation, UnaryOperation, ConstantValue, LoadOperation, NoopExpression,
    ExtractExpression, SliceExpression
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
    module(ctx: any, config: { limits: StarkLimits; wasmOptions?: WasmOptions; }): any {

        const constants: ConstantValue[] = (ctx.constants)
            ? ctx.constants.map((c: any) => this.visit(c))
            : [];

        const tConstraints = this.visit(ctx.transitionConstraints);

        const x = constants;
    }

    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx: any): any { }

    // GLOBAL CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx: any): ConstantValue {
        const value: bigint | bigint[] | bigint[][] = (ctx.value)
            ? BigInt(ctx.value[0].image)
            : this.visit(ctx.vector || ctx.matrix);
        return new ConstantValue(value);
    }

    literalVector(ctx: any): bigint[] {
        const vector = new Array<bigint>(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            vector[i] = BigInt(ctx.elements[i].image);
        }
        return vector;
    }

    literalMatrix(ctx: any): bigint[][] {
        const result: bigint[][] = [];
        for (let i = 0; i < ctx.rows.length; i++) {
            result.push(this.visit(ctx.rows[i]));
        }
        return result;
    }

    literalMatrixRow(ctx: any): bigint[] {
        const row = new Array<bigint>(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            row[i] = BigInt(ctx.elements[i].image);
        }
        return row;
    }

    // READONLY REGISTERS
    // --------------------------------------------------------------------------------------------
    staticRegister(ctx: any): any { }

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx: any): any { }

    transitionConstraints(ctx: any): any {
        const body: Expression = this.visit(ctx.body);
    }

    executionFrame(ctx: any): any {
        
    }

    localDeclaration(ctx: any): any { }

    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx: any): Expression {
        if (ctx.content) {
            return this.visit(ctx.content);
        }
        else {
            return new ConstantValue(BigInt(ctx.value[0].image));
        }
    }

    binaryOperation(ctx: any): Expression { 
        const lhs: Expression = this.visit(ctx.lhs);
        const rhs: Expression = this.visit(ctx.rhs);
        const opToken = ctx.operation[0];

        let result: Expression;
        if (tokenMatcher(opToken, Add)) 
            result = BinaryOperation.add(lhs, rhs);
        else if (tokenMatcher(opToken, Sub))
            result = BinaryOperation.sub(lhs, rhs);
        else if (tokenMatcher(opToken, Mul))
            result = BinaryOperation.mul(lhs, rhs);
        else if (tokenMatcher(opToken, Div))
            result = BinaryOperation.div(lhs, rhs);
        else if (tokenMatcher(opToken, Exp))
            result = BinaryOperation.exp(lhs, rhs);
        else if (tokenMatcher(opToken, Prod))
            result = BinaryOperation.exp(lhs, rhs);
        else
            throw new Error(`Invalid operator '${opToken.image}'`);

        return result;
    }

    unaryExpression(ctx: any): Expression {
        const operand: Expression = this.visit(ctx.operand);
        const opToken = ctx.operation[0];

        let result: Expression;
        if (tokenMatcher(opToken, Neg)) 
            result = UnaryOperation.neg(operand);
        else if (tokenMatcher(opToken, Inv))
            result = UnaryOperation.inv(operand);
        else
            throw new Error(`Invalid operator '${opToken.image}'`);

        return result;
    }    

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vectorExpression(ctx: any): any { }

    extractExpression(ctx: any): ExtractExpression {
        const source: Expression = this.visit(ctx.source);
        const index = Number.parseInt(ctx.index[0].image, 10);
        return new ExtractExpression(source, index);
    }

    sliceExpression(ctx: any): SliceExpression {
        const source: Expression = this.visit(ctx.source);
        const start = Number.parseInt(ctx.start[0].image, 10);
        const end = Number.parseInt(ctx.end[0].image, 10);
        return new SliceExpression(source, start, end);
    }

    matrixExpression(ctx: any): any { }
    matrixRow(ctx: any): any { }

    // LOAD AND SAVE OPERATIONS
    // --------------------------------------------------------------------------------------------
    loadExpression(ctx: any): LoadOperation {
        const operation = ctx.operation[0].image;
        const index = Number.parseInt(ctx.index[0].image, 10);
        const result = new LoadOperation(operation, index, new NoopExpression([8, 0], new Array(8).fill(1n)));
        return result;
    }


    saveExpression(ctx: any): any { }
}

// EXPORT VISITOR INSTANCE
// ================================================================================================
export const visitor = new AirVisitor();