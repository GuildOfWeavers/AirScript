"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TraceTemplate_1 = require("./TraceTemplate");
// CLASS DEFINITION
// ================================================================================================
class LoopTemplate extends TraceTemplate_1.TraceTemplate {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain, inputs) {
        super(domain);
        this.domain = domain;
        this.inputs = new Set(inputs);
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
    addBlock(block) {
        if (!block.isSubdomainOf(this.domain)) {
            throw new Error('TODO: not subdomain');
        }
        this.blocks.push(block);
        this.registerMap.fill(block, block.domain.start, block.domain.end + 1);
    }
}
exports.LoopTemplate = LoopTemplate;
//# sourceMappingURL=LoopTemplate.js.map