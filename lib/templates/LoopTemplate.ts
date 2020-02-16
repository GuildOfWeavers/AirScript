// IMPORTS
// ================================================================================================
import { Interval } from "@guildofweavers/air-script";
import { TraceTemplate } from "./TraceTemplate";
import { LoopBaseTemplate } from "./LoopBaseTemplate";
import { validate } from "../utils";

// CLASS DEFINITION
// ================================================================================================
export class LoopTemplate extends TraceTemplate {

    readonly rank   : number;
    readonly inputs : Set<string>;
    readonly blocks : TraceTemplate[];

    private readonly registerMap: TraceTemplate[];
    isLeaf? : boolean;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain: Interval, parent?: LoopTemplate) {
        super(domain);
        this.inputs = new Set();
        this.rank = (parent ? parent.rank + 1 : 0);
        this.blocks = [];
        this.registerMap = new Array(this.domainWidth);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isComplete(): boolean {
        return (this.registerMap.findIndex(b => b === undefined) === -1);
    }

    get ownInputs(): string[] {
        const inputs = new Set(this.inputs);
        for (let block of this.blocks) {
            if (block instanceof LoopTemplate) {
                for (let input of block.inputs) {
                    inputs.delete(input);
                }
            }
        }
        return Array.from(inputs);
    }

    get cycleLength(): number | undefined {
        if (this.isLeaf === true) {
            return (this.blocks[0] as LoopBaseTemplate).cycleLength; // TODO
        }
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    setInputs(inputs: string[]): void {
        inputs.forEach(input => this.inputs.add(input));
    }

    addBlock(block: TraceTemplate) {
        if (this.isLeaf === undefined) {
            this.isLeaf = (block instanceof LoopBaseTemplate);
        }
        else if (this.isLeaf === true) {
            validate(!(block instanceof LoopTemplate), errors.blockTypeConflict('loop block'));
            // TODO: validate cycle length
        }
        else {
            validate(!(block instanceof LoopBaseTemplate), errors.blockTypeConflict('loop base'));
            // TODO: validate inputs
        }

        if (!block.isSubdomainOf(this.domain)) {
            throw new Error('TODO: not subdomain')
        }

        this.blocks.push(block);
        this.registerMap.fill(block, block.domain[0], block.domain[1] + 1);
    }
}

// ERRORS
// ================================================================================================
const errors = {
    blockTypeConflict       : (t: any) => `cannot add block of type ${t.name} to loop template`
};