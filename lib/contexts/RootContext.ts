// IMPORTS
// ================================================================================================
import { Context } from "./Context";
import { TraceDomain } from "@guildofweavers/air-script";
import { StoreOperation, FunctionContext } from "@guildofweavers/air-assembly";
import { StaticRegisterCounts } from "../Component";
import { SymbolInfo } from "../Module";
import { BLOCK_ID_PREFIX } from "../utils";

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

    private lastBlockId         : number;

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
        this.lastBlockId = 0;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    hasLocal(variable: string): boolean {
        return false;
    }

    getNextId(): string {
        const id = `${BLOCK_ID_PREFIX}${this.lastBlockId}`;
        this.lastBlockId++;
        return id;
    }
}