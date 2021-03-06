// IMPORTS
// ================================================================================================
import { Interval, SymbolInfo } from "@guildofweavers/air-script";
import { StoreOperation, FunctionContext } from "@guildofweavers/air-assembly";
import { Context } from "./ExecutionContext";
import { StaticRegisters } from "../Component";
import { BLOCK_ID_PREFIX, isInputInfoSymbol } from "../utils";

// MODULE VARIABLES
// ================================================================================================
const MAX_PATH_LEG = 255;

// CLASS DEFINITION
// ================================================================================================
export class RootContext implements Context {

    readonly domain             : Interval;
    readonly locals             : Set<string>;
    readonly inputs             : Set<string>;
    readonly statements         : StoreOperation[];
    readonly symbols            : Map<string, SymbolInfo>;
    readonly staticRegisters    : StaticRegisters;
    readonly base               : FunctionContext;

    private lastBlockId         : number;
    private inputRankMap        : Map<string, number>;
    private loopControllerMap   : Map<string, number>;
    private segmentControllerMap: Map<string, number>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain: Interval, base: FunctionContext, symbols: Map<string, SymbolInfo>, inputs: Map<string, number>, staticRegisters: StaticRegisters) {
        this.domain = domain;
        this.base = base;
        this.staticRegisters = staticRegisters;
        
        this.locals = new Set();
        this.statements = [];
        this.symbols = symbols;
        this.lastBlockId = 0;

        this.inputs = new Set();
        this.inputRankMap = inputs;
        this.inputRankMap.forEach((rank, input) => this.inputs.add(input));

        this.loopControllerMap = new Map();
        staticRegisters.loops.forEach((l, i) => this.loopControllerMap.set(pathToId(l.path), i));

        this.segmentControllerMap = new Map();
        staticRegisters.segments.forEach((s, i) => this.segmentControllerMap.set(pathToId(s.path), i));
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get traceWidth(): number {
        return this.domain[1];
    }

    get loopOffset(): number {
        return this.staticRegisters.inputs.length;
    }

    get segmentOffset(): number {
        return this.staticRegisters.inputs.length + this.staticRegisters.loops.length;
    }

    get auxRegistersOffset(): number {
        return this.staticRegisters.inputs.length
            + this.staticRegisters.loops.length
            + this.staticRegisters.segments.length;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    hasLocal(variable: string): boolean {
        return false;
    }

    getLocalHandle(variable: string): string | undefined {
        return undefined;
    }

    getNextId(): string {
        const id = `${BLOCK_ID_PREFIX}${this.lastBlockId}`;
        this.lastBlockId++;
        return id;
    }

    getLoopControllerIndex(path: number[]): number {
        const id = pathToId(path);
        const index = this.loopControllerMap.get(id);
        if (index === undefined) {
            throw new Error(`path ${path} did not resolve to a loop controller index`);
        }
        return index;
    }

    getSegmentControllerIndex(path: number[]): number {
        const id = pathToId(path);
        const index = this.segmentControllerMap.get(id);
        if (index === undefined) {
            throw new Error(`path ${path} did not resolve to a segment controller index`);
        }
        return index;
    }

    getInputRank(input: string): number {
        const rank = this.inputRankMap.get(input);
        if (rank === undefined) {
            throw new Error(`rank for input '${input}' could not be found`);
        }
        return rank;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function pathToId(path: number[]): string {
    const buffer = Buffer.allocUnsafe(path.length);
    let offset = 0;
    for (let leg of path) {
        if (leg > MAX_PATH_LEG || leg < 0) {
            throw new Error(`invalid path leg in path ${path}: all path legs must be integers between 0 and ${MAX_PATH_LEG}`);
        }
        offset = buffer.writeUInt8(leg, offset);
    }
    return buffer.toString('hex');;
}