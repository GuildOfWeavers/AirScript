"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Context_1 = require("./Context");
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class LoopContext extends Context_1.ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent) {
        super(parent);
        this.blockResults = [];
        this.rank = (parent instanceof Context_1.ExecutionContext ? parent.rank + 1 : 0);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get result() {
        utils_1.validate(this.blockResults.length > 0, errors.resultsNotYetSet());
        let result;
        if (this.blockResults.length === 1) {
            result = this.blockResults[0];
        }
        else {
            result = this.base.buildMakeVectorExpression(this.blockResults);
        }
        // TODO: check domain consistency of the results
        return result;
    }
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    addBlock(blockResult) {
        // TODO: validate blockResult expression
        this.blockResults.push(blockResult);
    }
}
exports.LoopContext = LoopContext;
// ERRORS
// ================================================================================================
const errors = {
    resultsNotYetSet: () => `loop results haven't been set yet`
};
//# sourceMappingURL=LoopContext.js.map