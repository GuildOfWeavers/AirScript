// IMPORTS
// ================================================================================================
import {
    FunctionContext, Expression, LiteralValue, BinaryOperation, UnaryOperation, MakeVector,
    GetVectorElement, SliceVector, MakeMatrix, StoreOperation, LoadExpression
} from "@guildofweavers/air-assembly";
import { validate, RegisterRefs } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class ExecutionContext {

    readonly base               : FunctionContext;
    readonly constants          : Map<string, number>;
    readonly blocks             : ExpressionBlock[];
    readonly statements         : StoreOperation[];

    private lastBlockId         : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base: FunctionContext) {
        this.base = base;
        this.statements = [];
        this.blocks = [];
        this.lastBlockId = 0;

        this.constants = new Map();
        this.base.constants.forEach((c, i) => this.constants.set(c.handle!.substring(1), i));
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get currentBlock(): ExpressionBlock {
        return this.blocks[this.blocks.length - 1];
    }

    // SYMBOLIC REFERENCES
    // --------------------------------------------------------------------------------------------
    getSymbolReference(symbol: string): Expression {
        let result: Expression;
        if (symbol.startsWith('$')) {
            let param = symbol.substring(0, 2);
            result = this.base.buildLoadExpression(`load.param`, param);
            if (symbol.length > 2) {
                let index = Number(symbol.substring(2));
                result = this.base.buildGetVectorElementExpression(result, index);
            }
        }
        else {
            let index = this.constants.get(symbol);
            if (index !== undefined) {
                result = this.base.buildLoadExpression(`load.const`, index);
            }
            else {
                const block = this.findLocalVariableBlock(symbol);
                validate(block !== undefined, errors.undeclaredVarReference(symbol));
                result = block.loadLocal(symbol);
            }
        }

        return result;
    }

    setVariableAssignment(symbol: string, value: Expression): void {
        let block = this.findLocalVariableBlock(symbol);
        if (!block) {
            validate(!this.constants.has(symbol), errors.cannotAssignToConst(symbol));
            block = this.currentBlock;
        }
        
        validate(block === this.currentBlock, errors.cannotAssignToOuterScope(symbol));
        const statement = block.setLocal(symbol, value);
        this.statements.push(statement);
    }

    // FLOW CONTROLS
    // --------------------------------------------------------------------------------------------
    getSegmentModifier(segmentIdx: number): Expression {
        let result: Expression = this.base.buildLoadExpression('load.param', RegisterRefs.Segments);
        result = this.base.buildGetVectorElementExpression(result, segmentIdx);
        return result;
    }

    buildConditionalExpression(condition: Expression, tBlock: Expression, fBlock: Expression): Expression {
        /* TODO
        if (registerRef.isBinary) {
            throw new Error(`conditional expression must be based on a binary value`);
        }
        */

        tBlock = this.base.buildBinaryOperation('mul', tBlock, condition);
        
        const one = this.base.buildLiteralValue(this.base.field.one);
        condition = this.base.buildBinaryOperation('sub', one, condition);
        fBlock = this.base.buildBinaryOperation('mul', fBlock, condition);

        return this.base.buildBinaryOperation('add', tBlock, fBlock);
    }

    // STATEMENT BLOCKS
    // --------------------------------------------------------------------------------------------
    enterBlock() {
        this.blocks.push(new ExpressionBlock(this.lastBlockId, this.base));
        this.lastBlockId++;
    }

    exitBlock(): void {
        this.blocks.pop()!;
    }

    private findLocalVariableBlock(variable: string): ExpressionBlock | undefined {
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            if (this.blocks[i].hasLocal(variable)) return this.blocks[i];
        }
    }

    // PASS-THROUGH METHODS
    // --------------------------------------------------------------------------------------------
    buildLiteralValue(value: bigint | bigint[] | bigint[]): LiteralValue {
        return this.base.buildLiteralValue(value);
    }

    buildBinaryOperation(operation: string, lhs: Expression, rhs: Expression): BinaryOperation {
        return this.base.buildBinaryOperation(operation, lhs, rhs);
    }

    buildUnaryOperation(operation: string, operand: Expression): UnaryOperation {
        return this.base.buildUnaryOperation(operation, operand);
    }

    buildMakeVectorExpression(elements: Expression[]): MakeVector {
        return this.base.buildMakeVectorExpression(elements);
    }

    buildGetVectorElementExpression(source: Expression, index: number): GetVectorElement {
        return this.base.buildGetVectorElementExpression(source, index);
    }

    buildSliceVectorExpression(source: Expression, start: number, end: number): SliceVector {
        return this.base.buildSliceVectorExpression(source, start, end);
    }

    buildMakeMatrixExpression(elements: Expression[][]): MakeMatrix {
        return this.base.buildMakeMatrixExpression(elements);
    }

    buildFunctionCall(func: string, params: Expression[]): Expression {
        return this.base.buildCallExpression(func, params);
    }
}

// EXPRESSION BLOCK CLASS
// ================================================================================================
class ExpressionBlock {

    readonly id     : string;
    readonly locals : Map<string, number>;
    readonly context: FunctionContext;

    constructor (id: number, context: FunctionContext) {
        this.id = `b${id}`;
        this.locals = new Map();
        this.context = context;
    }

    hasLocal(variable: string): boolean {
        return this.locals.has(`${this.id}_${variable}`);
    }

    setLocal(variable: string, value: Expression): StoreOperation {
        variable = `${this.id}_${variable}`;
        if (!this.locals.has(variable)) {
            this.locals.set(variable, this.locals.size);
            this.context.addLocal(value.dimensions, `$${variable}`);
        }
        return this.context.buildStoreOperation(`$${variable}`, value);
    }

    loadLocal(variable: string): LoadExpression {
        variable = `${this.id}_${variable}`;
        validate(this.locals.has(variable), errors.undeclaredVarReference(variable));
        return this.context.buildLoadExpression(`load.local`, `$${variable}`);
    }

    getLocalIndex(variable: string): number | undefined {
        return this.locals.get(`${this.id}_${variable}`);
    }
}

// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference  : (s: any) => `variable ${s} is referenced before declaration`,
    cannotAssignToConst     : (c: any) => `cannot assign a value to a constant ${c}`,
    cannotAssignToOuterScope: (v: any) => `cannot assign a value to an outer scope variable ${v}`
};