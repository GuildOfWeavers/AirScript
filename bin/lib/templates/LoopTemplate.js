"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TraceTemplate_1 = require("./TraceTemplate");
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
    get isLeaf() {
        return (this._isLeaf === true);
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    setInputs(inputs) {
        inputs.forEach(input => this.inputs.add(input));
    }
    addLoopBlock(block) {
        if (this._isLeaf === undefined) {
            this._isLeaf = false;
        }
        utils_1.validate(this._isLeaf === false, errors.cannotAddLoopToLeaf());
        utils_1.validate(block.isSubdomainOf(this.domain), errors.invalidLoopSubdomain(block.domain, this.domain));
        // TODO: validate block
        this.blocks.push(block);
        this.registerMap.fill(block, block.domain[0], block.domain[1] + 1);
    }
    addLoopBaseBlock(block) {
        if (this._isLeaf === undefined) {
            this._isLeaf = true;
        }
        utils_1.validate(this._isLeaf === true, errors.cannotAddBaseToNonLeaf());
        utils_1.validate(block.isSubdomainOf(this.domain), errors.invalidLoopSubdomain(block.domain, this.domain));
        block.validate();
        this.blocks.push(block);
        this.registerMap.fill(block, block.domain[0], block.domain[1] + 1);
    }
    addDelegateBlock(block) {
        if (this._isLeaf === undefined) {
            this._isLeaf = true;
        }
        utils_1.validate(this._isLeaf === true, errors.cannotAddDelegateToNonLeaf());
        utils_1.validate(block.isSubdomainOf(this.domain), errors.invalidDelegateSubdomain(block.domain, this.domain));
        this.blocks.push(block);
        this.registerMap.fill(block, block.domain[0], block.domain[1] + 1);
    }
    getDepth(inputRankMap) {
        let maxRank = 0;
        for (let input of this.inputs) {
            let inputRank = inputRankMap.get(input);
            if (inputRank > maxRank) {
                maxRank = inputRank;
            }
        }
        return maxRank - this.rank;
    }
}
exports.LoopTemplate = LoopTemplate;
// ERRORS
// ================================================================================================
const errors = {
    cannotAddLoopToLeaf: () => `cannot add loop block to a leaf block`,
    cannotAddBaseToNonLeaf: () => `cannot add loop base to a non-leaf block`,
    cannotAddDelegateToNonLeaf: () => `cannot add function call to a non-leaf block`,
    invalidLoopSubdomain: (i, o) => `inner loop domain ${i} must be a subset of outer domain ${o}`,
    invalidBaseSubdomain: (i, o) => `segment loop domain ${i} must be a subset of outer domain ${o}`,
    invalidDelegateSubdomain: (i, o) => `function call domain ${i} must be a subset of outer domain ${o}`
};
//# sourceMappingURL=LoopTemplate.js.map