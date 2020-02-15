// IMPORTS
// ================================================================================================
import { Interval } from "@guildofweavers/air-script";
import { InputRegisterMaster } from "@guildofweavers/air-assembly";
import { TraceTemplate, RegisterSpecs } from "./TraceTemplate";
import { LoopBaseTemplate } from "./LoopBaseTemplate";
import { SymbolInfo, InputInfo } from "../Module";
import { validate } from "../utils";

// INTERFACES
// ================================================================================================
type BlockType = typeof LoopTemplate | typeof LoopBaseTemplate;

// CLASS DEFINITION
// ================================================================================================
export class LoopTemplate extends TraceTemplate {

    readonly rank   : number;
    readonly inputs : Set<string>;
    readonly blocks : TraceTemplate[];

    private blockType?          : BlockType;
    private readonly registerMap: TraceTemplate[];

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

    get isLeaf(): boolean {
        return (this.blockType === LoopBaseTemplate);
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    setInputs(inputs: string[]): void {
        inputs.forEach(input => this.inputs.add(input));
    }

    addBlock(block: TraceTemplate) {
        const blockType = block.constructor as BlockType;
        if (this.blockType === undefined) {
            this.blockType = blockType;
        }
        else {
            validate(blockType === this.blockType, errors.blockTypeConflict(blockType));
        }

        if (!block.isSubdomainOf(this.domain)) {
            throw new Error('TODO: not subdomain')
        }

        // TODO: validate cycle length

        this.blocks.push(block);
        this.registerMap.fill(block, block.domain[0], block.domain[1] + 1);
    }

    buildRegisterSpecs(registers: RegisterSpecs, symbols: Map<string, SymbolInfo>, path: number[], masterParent?: InputRegisterMaster): void {
        
        const inputOffset = registers.inputs.length;
        const masterPeer: InputRegisterMaster = { relation: 'peerof', index: inputOffset };

        const cycleLength = (this.isLeaf)
            ? (this.blocks[0] as LoopBaseTemplate).cycleLength
            : undefined;

        // build input registers for this loop
        let isAnchor = true;
        for (let inputName of this.inputs) {
            const symbol = symbols.get(inputName) as InputInfo;
            if (symbol.rank !== this.rank) continue;    // TODO: remove
            validate(symbol !== undefined, errors.undeclaredInput(inputName));
            validate(symbol.type === 'input', errors.invalidLoopInput(inputName));
            //validate(symbol.rank === this.rank, errors.inputRankMismatch(inputName));

            for (let k = 0; k < (symbol.dimensions[0] || 1); k++) {
                registers.inputs.push({
                    scope       : symbol.scope,
                    binary      : symbol.binary,
                    master      : isAnchor || this.isLeaf ? masterParent : masterPeer,
                    steps       : cycleLength
                });
                isAnchor = false;
            }
        }

        // add mask register for the loop
        registers.masks.push({
            input   : inputOffset,
            path    : path
        });

        // recurse down for all child blocks
        const master: InputRegisterMaster = { relation: 'childof', index: masterPeer.index };
        this.blocks.forEach((block, i) => {
            block.buildRegisterSpecs(registers, symbols, path.concat(i), master);
        });
    }
}

// ERRORS
// ================================================================================================
const errors = {
    undeclaredInput         : (r: any) => `input '${r}' is used without being declared`,
    invalidLoopInput        : (s: any) => `symbol '${s}' cannot be used in loop header`,
    inputRankMismatch       : (s: any) => `rank of input '${s}' does not match loop depth`,
    blockTypeConflict       : (t: any) => `cannot add block of type ${t.name} to loop template`
};