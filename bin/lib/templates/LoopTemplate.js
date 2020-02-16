"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TraceTemplate_1 = require("./TraceTemplate");
const LoopBaseTemplate_1 = require("./LoopBaseTemplate");
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class LoopTemplate extends TraceTemplate_1.TraceTemplate {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain, parent) {
        super(domain);
        this.inputs = new Set();
        this.rank = (parent ? parent.rank + 1 : 0);
        this.blocks = [];
        this.registerMap = new Array(this.domainWidth);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isComplete() {
        return (this.registerMap.findIndex(b => b === undefined) === -1);
    }
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    setInputs(inputs) {
        inputs.forEach(input => this.inputs.add(input));
    }
    addBlock(block) {
        if (this.isLeaf === undefined) {
            this.isLeaf = (block instanceof LoopBaseTemplate_1.LoopBaseTemplate);
        }
        else if (this.isLeaf === true) {
            utils_1.validate(!(block instanceof LoopTemplate), errors.blockTypeConflict('loop block'));
            // TODO: validate cycle length
        }
        else {
            utils_1.validate(!(block instanceof LoopBaseTemplate_1.LoopBaseTemplate), errors.blockTypeConflict('loop base'));
            // TODO: validate inputs
        }
        if (!block.isSubdomainOf(this.domain)) {
            throw new Error('TODO: not subdomain');
        }
        this.blocks.push(block);
        this.registerMap.fill(block, block.domain[0], block.domain[1] + 1);
    }
    buildRegisterSpecs(registers, symbols, path, masterParent) {
        const inputOffset = registers.inputs.length;
        const masterPeer = { relation: 'peerof', index: inputOffset };
        const cycleLength = (this.isLeaf)
            ? this.blocks[0].cycleLength
            : undefined;
        // build input registers for this loop
        let isAnchor = true;
        for (let inputName of this.inputs) {
            const symbol = symbols.get(inputName);
            if (symbol.rank !== this.rank)
                continue; // TODO: remove
            utils_1.validate(symbol !== undefined, errors.undeclaredInput(inputName));
            utils_1.validate(symbol.type === 'input', errors.invalidLoopInput(inputName));
            //validate(symbol.rank === this.rank, errors.inputRankMismatch(inputName));
            for (let k = 0; k < (symbol.dimensions[0] || 1); k++) {
                registers.inputs.push({
                    scope: symbol.scope,
                    binary: symbol.binary,
                    master: isAnchor || this.isLeaf ? masterParent : masterPeer,
                    steps: cycleLength
                });
                isAnchor = false;
            }
        }
        // add mask register for the loop
        registers.masks.push({
            input: inputOffset,
            path: path
        });
        // recurse down for all child blocks
        const master = { relation: 'childof', index: masterPeer.index };
        this.blocks.forEach((block, i) => {
            block.buildRegisterSpecs(registers, symbols, path.concat(i), master);
        });
    }
}
exports.LoopTemplate = LoopTemplate;
// ERRORS
// ================================================================================================
const errors = {
    undeclaredInput: (r) => `input '${r}' is used without being declared`,
    invalidLoopInput: (s) => `symbol '${s}' cannot be used in loop header`,
    inputRankMismatch: (s) => `rank of input '${s}' does not match loop depth`,
    blockTypeConflict: (t) => `cannot add block of type ${t.name} to loop template`
};
//# sourceMappingURL=LoopTemplate.js.map