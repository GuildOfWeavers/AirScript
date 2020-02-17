"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TraceTemplate_1 = require("./TraceTemplate");
const LoopBaseTemplate_1 = require("./LoopBaseTemplate");
const utils_1 = require("../utils");
const DelegateTemplate_1 = require("./DelegateTemplate");
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
    get ownInputs() {
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
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    setInputs(inputs) {
        inputs.forEach(input => this.inputs.add(input));
    }
    addBlock(block) {
        if (this.isLeaf === undefined) {
            this.isLeaf = (block instanceof LoopBaseTemplate_1.LoopBaseTemplate || block instanceof DelegateTemplate_1.DelegateTemplate);
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
}
exports.LoopTemplate = LoopTemplate;
// ERRORS
// ================================================================================================
const errors = {
    blockTypeConflict: (t) => `cannot add block of type ${t.name} to loop template`
};
//# sourceMappingURL=LoopTemplate.js.map