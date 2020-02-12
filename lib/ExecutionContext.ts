// IMPORTS
// ================================================================================================
import {
    FunctionContext, Expression, LiteralValue, BinaryOperation, UnaryOperation, MakeVector,
    GetVectorElement, SliceVector, MakeMatrix, StoreOperation, ProcedureName
} from "@guildofweavers/air-assembly";
import { SymbolInfo, FunctionInfo } from './Module';
import { StaticRegisterCounts } from "./Component";
import { validate, BLOCK_ID_PREFIX, ProcedureParams, TRANSITION_FN_HANDLE, EVALUATION_FN_HANDLE, TRANSITION_FN_POSTFIX, EVALUATION_FN_POSTFIX } from './utils';
import { ExecutionContext as Context, RootContext, ExprBlockContext, LoopContext, LoopBlockContext, LoopBaseContext } from "./contexts";
import { TraceDomain } from "@guildofweavers/air-script";

// CLASS DEFINITION
// ================================================================================================
export class ExecutionContext {

    readonly base               : FunctionContext;

    readonly blocks             : Context[];
    readonly statements         : StoreOperation[];
    readonly initializers       : Expression[];
    readonly segments           : Expression[];
    readonly staticRegisters    : StaticRegisterCounts;

    private lastBlockId         : number;

    private readonly symbols    : Map<string, SymbolInfo>;

    readonly delegates          : Expression[];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base: FunctionContext, symbols: Map<string, SymbolInfo>, staticRegisters: StaticRegisterCounts) {
        this.base = base;
        this.symbols = symbols;
        this.staticRegisters = staticRegisters;
        this.statements = [];
        this.blocks = [];
        this.initializers = [];
        this.segments = [];
        this.lastBlockId = 0;
        this.delegates = [];
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get currentBlock(): Context {
        return this.blocks[this.blocks.length - 1];
    }

    get loopOffset(): number {
        return this.staticRegisters.inputs;
    }

    get segmentOffset(): number {
        return this.staticRegisters.inputs + this.staticRegisters.loops;
    }

    get auxRegisterOffset(): number {
        return this.staticRegisters.inputs + this.staticRegisters.loops + this.staticRegisters.segments;
    }

    get procedureName(): ProcedureName {
        if (this.base.handle === TRANSITION_FN_HANDLE) {
            return 'transition';
        }
        else if (this.base.handle === EVALUATION_FN_HANDLE) {
            return 'evaluation';
        }
        else {
            throw new Error('TODO: invalid procedure');
        }
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
                    const startIdx = info.offset!;
                    const endIdx = startIdx + symbolLength - 1;
                    result = this.base.buildSliceVectorExpression(result, startIdx, endIdx);
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
                throw new Error(`cannot assign to non-variable symbol '${symbol}'`);
            }
            block = this.currentBlock;
        }
        
        validate(block === this.currentBlock, errors.cannotAssignToOuterScope(symbol));
        const statement = block.setLocal(symbol, value);
        this.statements.push(statement);
    }

    // FLOW CONTROLS
    // --------------------------------------------------------------------------------------------
    addInitializer(initResult: Expression): void {
        validate(this.initializers.length < this.staticRegisters.loops,
            errors.tooManyLoops(this.staticRegisters.loops));
        this.initializers.push(initResult);

        (this.currentBlock as LoopBlockContext | LoopBaseContext).setInitializer(initResult);
    }

    addSegment(segmentResult: Expression): void {
        validate(this.segments.length < this.staticRegisters.segments,
            errors.tooManySegments(this.staticRegisters.segments));
        this.segments.push(segmentResult);

        (this.currentBlock as LoopBaseContext).addSegment(segmentResult);
    }

    getLoopController(loopIdx: number): Expression {
        loopIdx = this.loopOffset + loopIdx;
        let result: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, loopIdx);
        const one = this.base.buildLiteralValue(this.base.field.one);
        for (let i = loopIdx - 1; i >= this.loopOffset; i--) {
            let parent: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
            parent = this.base.buildGetVectorElementExpression(parent, i);
            parent = this.base.buildBinaryOperation('sub', one, parent);
            result = this.base.buildBinaryOperation('mul', result, parent);
        }
        return result;
    }

    getSegmentController(segmentIdx: number): Expression {
        segmentIdx = this.segmentOffset + segmentIdx;
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

    // STATEMENT BLOCKS
    // --------------------------------------------------------------------------------------------
    enterBlock(type?: string) {

        const id = `${BLOCK_ID_PREFIX}${this.lastBlockId}`;
        let context: Context;
        if (this.blocks.length === 0) {
            const domain: TraceDomain = { start: 0, end: 0 };
            const root = new RootContext(domain, this.base, this.staticRegisters);
            context = createContext(type, id, root);
        }
        else {
            context = createContext(type, id, this.blocks[this.blocks.length - 1]);
        }
        this.blocks.push(context);
        this.lastBlockId++;
    }

    exitBlock(): void {
        const context = this.blocks.pop()!;
        if (context instanceof LoopBaseContext || context instanceof LoopBlockContext) {
            (this.currentBlock as LoopContext).addBlock(context.result);
        }
        else if (context instanceof LoopContext && this.currentBlock !== undefined) {
            (this.currentBlock as LoopBlockContext).setLoopResult(context.result);
        }
    }

    private findLocalVariableBlock(variable: string): Context | undefined {
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            if (this.blocks[i].hasLocal(variable)) return this.blocks[i];
        }
    }

    // FUNCTION CALLS
    // --------------------------------------------------------------------------------------------
    buildTransitionCall(): Expression {
        const params = [
            this.base.buildLoadExpression('load.param', ProcedureParams.thisTraceRow),
            this.base.buildLoadExpression('load.param', ProcedureParams.staticRow)
        ];
        return this.base.buildCallExpression(TRANSITION_FN_HANDLE, params);
    }

    addFunctionCall(funcName: string, inputs: Expression[], domain: [number, number]): void {
        // TODO: validate domain

        const fName = funcName + (this.procedureName === 'transition' ? TRANSITION_FN_POSTFIX : EVALUATION_FN_POSTFIX);
        const info = this.symbols.get(fName) as FunctionInfo;
        validate(info !== undefined, errors.undefinedFuncReference(funcName));
        validate(info.type === 'func', errors.invalidFuncReference(funcName));
        // TODO: validate rank

        let traceRow: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.thisTraceRow);
        if (domain[0] > 0 || domain[1] < 10) { // TODO: get upper bound from somewhere
            traceRow = this.base.buildSliceVectorExpression(traceRow, domain[0], domain[1]);
        }

        // TODO: if we are in evaluator, add next state as parameter as well
        
        const statics = inputs.slice();

        let masks: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
        const maskOffset = this.loopOffset + info.rank;
        const maskCount = this.staticRegisters.loops - info.rank;
        masks = this.base.buildSliceVectorExpression(masks, maskOffset, maskOffset + maskCount - 1);
        statics.push(masks);

        if (info.auxLength > 0) {
            const auxOffset = this.auxRegisterOffset + info.auxOffset;
            let aux: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
            aux = this.base.buildSliceVectorExpression(aux, auxOffset, auxOffset + info.auxLength - 1);
            statics.push(aux);
        }

        const staticRow = this.base.buildMakeVectorExpression(statics);
        const callExpression = this.base.buildCallExpression(info.handle, [traceRow, staticRow]);

        this.delegates.push(callExpression);
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
}

// HELPER FUNCTIONS
// ================================================================================================
function createContext(type: string | undefined, id: string, parent: any) {
    if (type === 'loop') {
        return new LoopContext(id, parent);
    }
    else if (type === 'loopBlock') {
        return new LoopBlockContext(id, parent);
    }
    else if (type === 'loopBase') {
        return new LoopBaseContext(id, parent);
    }
    else {
        return new ExprBlockContext(id, parent);
    }
}

// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference  : (s: any) => `variable ${s} is referenced before declaration`,
    undefinedFuncReference  : (f: any) => `function ${f} has not been defined`,
    invalidFuncReference    : (f: any) => `symbol ${f} is not a function`,
    cannotAssignToConst     : (c: any) => `cannot assign a value to a constant ${c}`,
    cannotAssignToOuterScope: (v: any) => `cannot assign a value to an outer scope variable ${v}`,
    tooManyLoops            : (e: any) => `number of input loops cannot exceed ${e}`,
    tooManySegments         : (e: any) => `number of segment loops cannot exceed ${e}`
};