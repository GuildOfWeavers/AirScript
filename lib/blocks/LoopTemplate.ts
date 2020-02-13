// IMPORTS
// ================================================================================================
import { TraceDomain } from "@guildofweavers/air-script";
import { TraceTemplate } from "./TraceTemplate";

// CLASS DEFINITION
// ================================================================================================
export class LoopTemplate extends TraceTemplate {

    readonly domain : TraceDomain;
    readonly inputs : Set<string>;
    readonly blocks : TraceTemplate[];

    private readonly registerMap: TraceTemplate[];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain: TraceDomain, inputs: string[]) {
        super(domain);
        this.domain = domain;
        this.inputs = new Set(inputs);
        this.blocks = [];
        this.registerMap = new Array(this.domainWidth);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isComplete(): boolean {
        return (this.registerMap.findIndex(b => b === undefined) === -1);
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    addBlock(block: TraceTemplate) {
        if (!block.isSubdomainOf(this.domain)) {
            throw new Error('TODO: not subdomain')
        }

        this.blocks.push(block);
        this.registerMap.fill(block, block.domain.start, block.domain.end + 1);
    }
}