// IMPORTS
// ================================================================================================
import { Interval } from "@guildofweavers/air-script";
import { StoreOperation, FunctionContext } from "@guildofweavers/air-assembly";
import { Context } from "./Context";
import { StaticRegisterCounts } from "../Component";
import { SymbolInfo } from "../Module";
import { BLOCK_ID_PREFIX } from "../utils";

// CLASS DEFINITION
// ================================================================================================
export class RootContext implements Context {

    readonly domain             : Interval;
    readonly locals             : Set<string>;
    readonly inputs             : Set<string>;
    readonly statements         : StoreOperation[];
    readonly symbols            : Map<string, SymbolInfo>;
    readonly staticRegisters    : StaticRegisterCounts;
    readonly base               : FunctionContext;

    private lastBlockId         : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain: Interval, base: FunctionContext, symbols: Map<string, SymbolInfo>, staticRegisters: StaticRegisterCounts) {
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
    setInputs(inputs: string[]): void {
        // TODO: remove
    }

    hasLocal(variable: string): boolean {
        return false;
    }

    getNextId(): string {
        const id = `${BLOCK_ID_PREFIX}${this.lastBlockId}`;
        this.lastBlockId++;
        return id;
    }
}