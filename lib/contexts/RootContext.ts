// IMPORTS
// ================================================================================================
import { Context } from "./Context";
import { TraceDomain } from "@guildofweavers/air-script";
import { StoreOperation, FunctionContext } from "@guildofweavers/air-assembly";
import { StaticRegisterCounts } from "../Component";
import { SymbolInfo } from "../Module";

// CLASS DEFINITION
// ================================================================================================
export class RootContext implements Context {

    readonly domain             : TraceDomain;
    readonly locals             : Set<string>;
    readonly inputs             : Set<string>;
    readonly statements         : StoreOperation[];
    readonly symbols            : Map<string, SymbolInfo>;
    readonly staticRegisters    : StaticRegisterCounts;
    readonly base               : FunctionContext;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain: TraceDomain, base: FunctionContext, symbols: Map<string, SymbolInfo>, staticRegisters: StaticRegisterCounts) {
        this.domain = domain;
        this.base = base;
        this.staticRegisters = staticRegisters;

        this.inputs = new Set();
        this.locals = new Set();
        this.statements = [];
        this.symbols = symbols;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    hasLocal(variable: string): boolean {
        return false;
    }
}