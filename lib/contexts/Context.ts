// IMPORTS
// ================================================================================================
import { TraceDomain } from "@guildofweavers/air-script";
import {
    Expression, StoreOperation, FunctionContext, LiteralValue, BinaryOperation, UnaryOperation,
    MakeVector, GetVectorElement, SliceVector, MakeMatrix
} from "@guildofweavers/air-assembly";
import { SymbolInfo } from "../Module";
import { StaticRegisterCounts } from "../Component";
import { validate, ProcedureParams, TRANSITION_FN_HANDLE } from "../utils";

// INTERFACES
// ================================================================================================
export interface Context {
    readonly domain             : TraceDomain;
    readonly inputs             : Set<string>;
    readonly locals             : Set<string>;
    readonly statements         : StoreOperation[];
    readonly symbols            : Map<string, SymbolInfo>;
    readonly staticRegisters    : StaticRegisterCounts;
    readonly base               : FunctionContext;

    hasLocal(variable: string)  : boolean;
    getNextId()                 : string;
}

// EXECUTION CONTEXT CLASS
// ================================================================================================
export abstract class ExecutionContext implements Context {

    readonly id                 : string;
    readonly parent             : Context;
    readonly rank               : number;
    readonly domain             : TraceDomain;
    readonly inputs             : Set<string>;
    readonly locals             : Set<string>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent: Context, domain?: TraceDomain, inputs?: string[]) {
        this.id = parent.getNextId();
        this.parent = parent;
        this.rank = (parent instanceof ExecutionContext ? parent.rank : 0);

        if (domain) {
            // TODO: narrow domain
            this.domain = parent.domain;
        }
        else {
            this.domain = parent.domain;
        }

        if (inputs) {
            // TODO: narrow inputs
            this.inputs = parent.inputs;
        }
        else {
            this.inputs = parent.inputs;
        }

        this.locals = new Set();
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get base(): FunctionContext {
        return this.parent.base;
    }

    get symbols(): Map<string, SymbolInfo> {
        return this.parent.symbols;
    }

    get statements(): StoreOperation[] {
        return this.parent.statements;
    }

    get staticRegisters(): StaticRegisterCounts {
        return this.parent.staticRegisters;
    }

    get loopOffset(): number {
        return this.staticRegisters.inputs;
    }

    get segmentOffset(): number {
        return this.staticRegisters.inputs + this.staticRegisters.loops;
    }

    abstract get result(): Expression;

    // CONTROLLERS
    // --------------------------------------------------------------------------------------------
    getLoopController(loopIdx: number): Expression {
        loopIdx = this.loopOffset + loopIdx;
        let result: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, loopIdx);
        return result;
    }

    getSegmentController(segmentIdx: number): Expression {
        segmentIdx = this.segmentOffset + segmentIdx;
        let result: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, segmentIdx);
        return result;
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
            validate(this.hasLocal(symbol), errors.undeclaredVarReference(symbol));
            result = this.base.buildLoadExpression(`load.local`, this.buildLocalHandle(symbol));
        }

        return result;
    }

    setVariableAssignment(symbol: string, value: Expression): void {
        if (!this.hasLocal(symbol)) {
            const info = this.symbols.get(symbol);
            if (info) {
                validate(info.type !== 'const', errors.cannotAssignToConst(symbol));
                throw new Error(`cannot assign to non-variable symbol '${symbol}'`);
            }
        }
        else {
            validate(this.isOwnLocal(symbol), errors.cannotAssignToOuterScope(symbol));
        }
        
        const handle = this.buildLocalHandle(symbol);
        if (!this.locals.has(handle)) {
            this.locals.add(handle);
            this.base.addLocal(value.dimensions, handle);
        }
        const statement = this.base.buildStoreOperation(handle, value);

        this.statements.push(statement);
    }

    // CONTROL FLOW
    // --------------------------------------------------------------------------------------------
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
        // TODO
    }

    // LOCAL VARIABLES
    // --------------------------------------------------------------------------------------------
    hasLocal(variable: string): boolean {
        if (this.locals.has(this.buildLocalHandle(variable))) return true;
        else return (this.parent.hasLocal(variable));
    }

    isOwnLocal(variable: string): boolean {
        return this.locals.has(this.buildLocalHandle(variable));
    }

    private buildLocalHandle(variable: string): string {
        return `${this.id}_${variable}`;
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

    // OTHER PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    getNextId(): string {
        return this.parent.getNextId();
    }
}

// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference  : (s: any) => `variable ${s} is referenced before declaration`,
    cannotAssignToConst     : (c: any) => `cannot assign a value to a constant ${c}`,
    cannotAssignToOuterScope: (v: any) => `cannot assign a value to an outer scope variable ${v}`,
};