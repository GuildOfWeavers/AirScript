// IMPORTS
// ================================================================================================
import {
    FunctionContext, Expression, LiteralValue, BinaryOperation, UnaryOperation, MakeVector,
    GetVectorElement, SliceVector, MakeMatrix, StoreOperation, LoadExpression
} from "@guildofweavers/air-assembly";
import { SymbolInfo } from './Module';
import { FunctionInfo } from "./Component";
import { validate, BLOCK_ID_PREFIX, ProcedureParams } from './utils';

// INTERFACES
// ================================================================================================
interface ControllerOffsets {
    readonly loop   : number;
    readonly segment: number;
}

// CLASS DEFINITION
// ================================================================================================
export class ExecutionContext {

    readonly base               : FunctionContext;
    readonly blocks             : ExpressionBlock[];
    readonly statements         : StoreOperation[];

    private lastBlockId         : number;

    private readonly symbols    : Map<string, SymbolInfo>;
    private readonly functions  : Map<string, FunctionInfo>;
    private readonly offsets    : ControllerOffsets;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base: FunctionContext, symbols: Map<string, SymbolInfo>, functions: Map<string, FunctionInfo>, offsets: ControllerOffsets) {
        this.base = base;
        this.symbols = symbols;
        this.functions = functions;
        this.offsets = offsets;
        this.statements = [];
        this.blocks = [];
        this.lastBlockId = 0;
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
        const info = this.symbols.get(symbol);    
        if (info !== undefined) {
            result = this.base.buildLoadExpression(`load.${info.type}`, info.handle);
            if (info.subset) {
                const symbolLength = info.dimensions[0];
                if (symbolLength === 0) {
                    result = this.base.buildGetVectorElementExpression(result, info.offset!);
                }
                else {
                    result = this.base.buildSliceVectorExpression(result, info.offset!, symbolLength);
                }
            }
        }
        else {
            const block = this.findLocalVariableBlock(symbol);
            validate(block !== undefined, errors.undeclaredVarReference(symbol));
            result = block.loadLocal(symbol);
        }

        return result;
    }

    setVariableAssignment(symbol: string, value: Expression): void {
        let block = this.findLocalVariableBlock(symbol);
        if (!block) {
            const info = this.symbols.get(symbol);
            if (info) {
                validate(info.type !== 'const', errors.cannotAssignToConst(symbol));
                // TODO: check for other matches
            }
            block = this.currentBlock;
        }
        
        validate(block === this.currentBlock, errors.cannotAssignToOuterScope(symbol));
        const statement = block.setLocal(symbol, value);
        this.statements.push(statement);
    }

    // FLOW CONTROLS
    // --------------------------------------------------------------------------------------------
    getLoopController(loopIdx: number): Expression {
        loopIdx = this.offsets.loop + loopIdx;
        let result: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, loopIdx);
        for (let i = loopIdx - 1; i >= this.offsets.loop; i++) {
            let parent: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
            parent = this.base.buildGetVectorElementExpression(parent, loopIdx);
            parent = this.base.buildBinaryOperation('sub', this.base.buildLiteralValue(1n), parent); // TODO: get from field
            result = this.base.buildBinaryOperation('mul', result, parent);
        }
        return result;
    }

    getSegmentController(segmentIdx: number): Expression {
        segmentIdx = this.offsets.segment + segmentIdx;
        let result: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
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

    buildTransitionFunctionCall(): Expression {
        const params = [
            this.base.buildLoadExpression('load.param', ProcedureParams.thisTraceRow),
            this.base.buildLoadExpression('load.param', ProcedureParams.staticRow)
        ];
        return this.buildFunctionCall(this.functions.get('transition')!.handle, params);
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
        this.id = `${BLOCK_ID_PREFIX}${id}`;
        this.locals = new Map();
        this.context = context;
    }

    hasLocal(variable: string): boolean {
        return this.locals.has(`${this.id}_${variable}`);
    }

    setLocal(variable: string, value: Expression): StoreOperation {
        const handle = `${this.id}_${variable}`;
        if (!this.locals.has(handle)) {
            this.locals.set(handle, this.locals.size);
            this.context.addLocal(value.dimensions, handle);
        }
        return this.context.buildStoreOperation(handle, value);
    }

    loadLocal(variable: string): LoadExpression {
        const handle = `${this.id}_${variable}`;
        validate(this.locals.has(handle), errors.undeclaredVarReference(variable));
        return this.context.buildLoadExpression(`load.local`, handle);
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