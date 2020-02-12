// IMPORTS
// ================================================================================================
import { TraceDomain } from "@guildofweavers/air-script";
import { Expression, StoreOperation, FunctionContext, LoadExpression } from "@guildofweavers/air-assembly";
import { StaticRegisterCounts } from "../Component";
import { validate, ProcedureParams } from "../utils";

// INTERFACES
// ================================================================================================
export interface Context {
    readonly domain             : TraceDomain;
    readonly locals             : Map<string, number>;
    readonly inputs             : Set<string>;
    readonly statements         : StoreOperation[];
    readonly base               : FunctionContext;
    readonly staticRegisters    : StaticRegisterCounts;
}

// EXECUTION CONTEXT CLASS
// ================================================================================================
export abstract class ExecutionContext implements Context {

    readonly id                 : string;
    readonly rank               : number;
    readonly domain             : TraceDomain;
    readonly locals             : Map<string, number>;
    readonly inputs             : Set<string>;
    readonly statements         : StoreOperation[];
    readonly base               : FunctionContext;
    readonly staticRegisters    : StaticRegisterCounts;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(id: string, parent: Context, domain?: TraceDomain, inputs?: string[]) {
        this.id = id;
        this.base = parent.base;
        this.statements = parent.statements;
        this.staticRegisters = parent.staticRegisters;
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

        this.locals = new Map();
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
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

    // LOCAL VARIABLES
    // --------------------------------------------------------------------------------------------
    hasLocal(variable: string): boolean {
        return this.locals.has(`${this.id}_${variable}`);
    }

    setLocal(variable: string, value: Expression): StoreOperation {
        const handle = `${this.id}_${variable}`;
        if (!this.locals.has(handle)) {
            this.locals.set(handle, this.locals.size);
            this.base.addLocal(value.dimensions, handle);
        }
        return this.base.buildStoreOperation(handle, value);
    }

    loadLocal(variable: string): LoadExpression {
        const handle = `${this.id}_${variable}`;
        validate(this.locals.has(handle), errors.undeclaredVarReference(variable));
        return this.base.buildLoadExpression(`load.local`, handle);
    }

    getLocalIndex(variable: string): number | undefined {
        return this.locals.get(`${this.id}_${variable}`);
    }
}

// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference  : (s: any) => `variable ${s} is referenced before declaration`
};