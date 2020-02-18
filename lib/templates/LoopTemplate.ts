// IMPORTS
// ================================================================================================
import { Interval } from "@guildofweavers/air-script";
import { TraceTemplate } from "./TraceTemplate";
import { LoopBaseTemplate } from "./LoopBaseTemplate";
import { validate } from "../utils";
import { DelegateTemplate } from "./DelegateTemplate";

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

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    setInputs(inputs: string[]): void {
        inputs.forEach(input => this.inputs.add(input));
    }

    addLoopBlock(block: LoopTemplate): void {
        if (this.isLeaf === undefined) {
            this.isLeaf = false;
        }
        validate(this.isLeaf === false, errors.cannotAddLoopToLeaf());
        validate(block.isSubdomainOf(this.domain), errors.invalidLoopSubdomain(block.domain, this.domain));
        // TODO: validate block

        this.blocks.push(block);
        this.registerMap.fill(block, block.domain[0], block.domain[1] + 1);
    }

    addLoopBaseBlock(block: LoopBaseTemplate): void {
        if (this.isLeaf === undefined) {
            this.isLeaf = true;
        }
        validate(this.isLeaf === true, errors.cannotAddBaseToNonLeaf());
        validate(block.isSubdomainOf(this.domain), errors.invalidLoopSubdomain(block.domain, this.domain));
        block.validate();

        this.blocks.push(block);
        this.registerMap.fill(block, block.domain[0], block.domain[1] + 1);
    }

    addDelegateBlock(block: DelegateTemplate): void {
        if (this.isLeaf === undefined) {
            this.isLeaf = true;
        }
        validate(this.isLeaf === true, errors.cannotAddDelegateToNonLeaf());
        validate(block.isSubdomainOf(this.domain), errors.invalidDelegateSubdomain(block.domain, this.domain));

        this.blocks.push(block);
        this.registerMap.fill(block, block.domain[0], block.domain[1] + 1);
    }
}

// ERRORS
// ================================================================================================
const errors = {
    cannotAddLoopToLeaf         : () => `cannot add loop block to a leaf block`,
    cannotAddBaseToNonLeaf      : () => `cannot add loop base to a non-leaf block`,
    cannotAddDelegateToNonLeaf  : () => `cannot add function call to a non-leaf block`,
    invalidLoopSubdomain        : (i: any, o: any) => `inner loop domain ${i} must be a subset of outer domain ${o}`,
    invalidBaseSubdomain        : (i: any, o: any) => `segment loop domain ${i} must be a subset of outer domain ${o}`,
    invalidDelegateSubdomain    : (i: any, o: any) => `function call domain ${i} must be a subset of outer domain ${o}`
};