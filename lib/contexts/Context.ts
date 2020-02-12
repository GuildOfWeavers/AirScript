// IMPORTS
// ================================================================================================
import { FunctionContext, Expression, LoadExpression, StoreOperation } from "@guildofweavers/air-assembly";
import { validate, ProcedureParams } from "../utils";
import { TraceDomain } from "@guildofweavers/air-script";
import { StaticRegisterCounts } from "../Component";

// CLASS DEFINITION
// ================================================================================================
export class Context {

    readonly id         : string;
    readonly domain     : TraceDomain;
    readonly locals     : Map<string, number>;
    readonly inputs     : Set<string>;
    readonly statements : StoreOperation[];
    readonly base       : FunctionContext;

    readonly staticRegisters    : StaticRegisterCounts;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(id: string, domain: TraceDomain, inputs: Set<string>, statements: StoreOperation[], staticRegisters: StaticRegisterCounts, base: FunctionContext) {
        this.id = id;
        this.domain = domain;
        this.inputs = inputs;
        this.base = base;
        this.statements = statements;
        this.staticRegisters = staticRegisters;
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

    // PUBLIC METHODS
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

    // CONTROLLERS
    // --------------------------------------------------------------------------------------------
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
}

// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference  : (s: any) => `variable ${s} is referenced before declaration`
};