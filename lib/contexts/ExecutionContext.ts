// IMPORTS
// ================================================================================================
import { Interval, SymbolInfo } from "@guildofweavers/air-script";
import {
    Expression, StoreOperation, FunctionContext, LiteralValue, BinaryOperation, UnaryOperation,
    MakeVector, GetVectorElement, SliceVector, MakeMatrix
} from "@guildofweavers/air-assembly";
import { validate, ProcedureParams, TRANSITION_FN_HANDLE, EVALUATION_FN_HANDLE } from "../utils";
import { RootContext } from "./RootContext";

// INTERFACES
// ================================================================================================
export interface Context {
    readonly domain             : Interval;
    readonly inputs             : Set<string>;
    readonly locals             : Set<string>;
    readonly statements         : StoreOperation[];
    readonly symbols            : Map<string, SymbolInfo>;
    readonly base               : FunctionContext;

    readonly loopOffset         : number;
    readonly segmentOffset      : number;
    readonly auxRegistersOffset : number;

    hasLocal(variable: string): boolean;
    getLocalHandle(variable: string): string | undefined;

    getNextId(): string;
    getLoopControllerIndex(path: number[]): number;
    getSegmentControllerIndex(path: number[]): number;
}

// EXECUTION CONTEXT CLASS
// ================================================================================================
export class ExecutionContext implements Context {

    readonly id                 : string;
    readonly parent             : Context;
    readonly rank               : number;
    readonly domain             : Interval;
    readonly inputs             : Set<string>;
    readonly locals             : Set<string>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent: Context, domain?: Interval, inputs?: string[]) {
        this.id = parent.getNextId();
        this.parent = parent;
        this.rank = (parent instanceof ExecutionContext ? parent.rank : 0);
        this.domain = validateDomain(parent.domain, domain);
        this.inputs = validateInputs(parent.inputs, inputs);
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

    get loopOffset(): number {
        return this.parent.loopOffset;
    }

    get segmentOffset(): number {
        return this.parent.segmentOffset;
    }

    get auxRegistersOffset(): number {
        return this.parent.auxRegistersOffset;
    }

    get procedureName(): 'transition' | 'evaluation' {
        const handle = this.base.handle;
        if (handle === TRANSITION_FN_HANDLE) {
            return 'transition';
        }
        else if (handle === EVALUATION_FN_HANDLE) {
            return 'evaluation';
        }
        else {
            throw new Error(`execution context has an invalid procedure handle '${handle}'`);
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
            const handle = this.getLocalHandle(symbol);
            validate(handle !== undefined, errors.undeclaredVarReference(symbol));
            result = this.base.buildLoadExpression(`load.local`, handle);
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

    getCurrentBlockPath(): number[] {
        const path: number[] = [];
        let parent = this.parent;
        while (parent) {
            if (parent instanceof ExecutionContext) {
                if (isBlockContainer(parent)) {
                    path.unshift(parent.blocks.length);
                }
                parent = parent.parent;
            }
            else if (parent instanceof RootContext) {
                path.unshift(0); // position within root context
                break;
            }
        }
        return path;
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

    // LOCAL VARIABLES
    // --------------------------------------------------------------------------------------------
    hasLocal(variable: string): boolean {
        if (this.locals.has(this.buildLocalHandle(variable))) return true;
        else return (this.parent.hasLocal(variable));
    }

    isOwnLocal(variable: string): boolean {
        return this.locals.has(this.buildLocalHandle(variable));
    }

    getLocalHandle(variable: string): string | undefined {
        const handle = this.buildLocalHandle(variable);
        if (this.locals.has(handle)) return handle;
        else return (this.parent.getLocalHandle(variable));
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

    // PUBLIC METHODS DELEGATED TO ROOT CONTEXT
    // --------------------------------------------------------------------------------------------
    getNextId(): string {
        return this.parent.getNextId();
    }

    getLoopControllerIndex(path: number[]): number {
        return this.parent.getLoopControllerIndex(path);
    }

    getSegmentControllerIndex(path: number[]): number {
        return this.parent.getSegmentControllerIndex(path);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function isBlockContainer(context: any): context is { blocks: any[]; } {
    return (context.blocks !== undefined);
}

function validateDomain(parent: Interval, own?: Interval): Interval {
    if (!own) return parent;
    validate(own[0] >= parent[0] && own[1] <= parent[1], errors.notSubdomainOfParent(own, parent));
    return own;
}

function validateInputs(parent: Set<string>, own?: string[]): Set<string> {
    if (!own) return parent;
    for (let value of own) {
        validate(parent.has(value), errors.inputMissingFromParent(value));
    }
    return new Set(own);
}

// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference  : (s: any) => `variable ${s} is referenced before declaration`,
    cannotAssignToConst     : (c: any) => `cannot assign a value to a constant ${c}`,
    cannotAssignToOuterScope: (v: any) => `cannot assign a value to an outer scope variable ${v}`,
    inputMissingFromParent  : (i: any) => `input '${i}' does not appear in parent context`,
    notSubdomainOfParent    : (d: any, p: any) => `domain ${d} is not a subdomain of parent domain ${p}`
};