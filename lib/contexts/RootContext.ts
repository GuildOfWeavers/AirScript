// IMPORTS
// ================================================================================================
import { Context } from "./Context2";
import { TraceDomain } from "@guildofweavers/air-script";
import { StoreOperation, FunctionContext } from "@guildofweavers/air-assembly";
import { StaticRegisterCounts } from "../Component";

// CLASS DEFINITION
// ================================================================================================
export class RootContext implements Context {

    readonly domain             : TraceDomain;
    readonly locals             : Map<string, number>;
    readonly inputs             : Set<string>;
    readonly statements         : StoreOperation[];
    readonly base               : FunctionContext;
    readonly staticRegisters    : StaticRegisterCounts;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain: TraceDomain, base: FunctionContext, staticRegisters: StaticRegisterCounts) {
        this.domain = domain;
        this.base = base;
        this.staticRegisters = staticRegisters;

        this.locals = new Map();
        this.inputs = new Set();
        this.statements = [];
    }
}