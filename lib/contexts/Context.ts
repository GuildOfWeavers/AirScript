// IMPORTS
// ================================================================================================
import { FunctionContext, Expression, LoadExpression, StoreOperation } from "@guildofweavers/air-assembly";
import { validate } from "../utils";
import { TraceDomain } from "@guildofweavers/air-script";

// CLASS DEFINITION
// ================================================================================================
export class Context {

    readonly id     : string;
    readonly locals : Map<string, number>;
    readonly inputs : Set<string>;
    readonly context: FunctionContext;
    readonly domain : TraceDomain;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(id: string, domain: TraceDomain, inputs: Set<string>, context: FunctionContext) {
        this.id = id;
        this.domain = domain;
        this.inputs = inputs;
        this.context = context;
        this.locals = new Map();
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
    undeclaredVarReference  : (s: any) => `variable ${s} is referenced before declaration`
};