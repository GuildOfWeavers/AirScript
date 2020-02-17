"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ExecutionContext_1 = require("./ExecutionContext");
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class LoopContext extends ExecutionContext_1.ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent, inputs) {
        super(parent, undefined, inputs);
        this.blocks = [];
        this.rank = (parent instanceof ExecutionContext_1.ExecutionContext ? parent.rank + 1 : 0);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get result() {
        utils_1.validate(this.blocks.length > 0, errors.resultsNotYetSet());
        const result = (this.blocks.length === 1)
            ? this.blocks[0]
            : this.base.buildMakeVectorExpression(this.blocks);
        return result;
    }
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    addBaseBlock(initResult, segmentResults) {
        const dimensions = initResult.dimensions;
        // initializer result
        const controller = this.getLoopController();
        let result = this.base.buildBinaryOperation('mul', initResult, controller);
        // segment results
        segmentResults.forEach((expression, i) => {
            utils_1.validate(utils_1.areSameDimensions(dimensions, expression.dimensions), errors.baseResultMismatch());
            const resultControl = this.getSegmentController(i);
            expression = this.base.buildBinaryOperation('mul', expression, resultControl);
            result = this.base.buildBinaryOperation('add', result, expression);
        });
        // store result in a local variable
        this.base.addLocal(dimensions, this.id);
        this.statements.push(this.base.buildStoreOperation(this.id, result));
        this.blocks.push(this.base.buildLoadExpression(`load.local`, this.id));
    }
    addLoopBlock(initResult, loopResult) {
        const dimensions = initResult.dimensions;
        utils_1.validate(utils_1.areSameDimensions(dimensions, loopResult.dimensions), errors.loopResultMismatch());
        // initializer result
        const controller = this.getLoopController();
        initResult = this.base.buildBinaryOperation('mul', initResult, controller);
        // loop result
        const one = this.base.buildLiteralValue(this.base.field.one);
        const invController = this.base.buildBinaryOperation('sub', one, controller);
        loopResult = this.base.buildBinaryOperation('mul', loopResult, invController);
        // combine results and store them in a local variable
        this.base.addLocal(dimensions, this.id);
        const result = this.base.buildBinaryOperation('add', initResult, loopResult);
        this.statements.push(this.base.buildStoreOperation(this.id, result));
        this.blocks.push(this.base.buildLoadExpression(`load.local`, this.id));
    }
}
exports.LoopContext = LoopContext;
// ERRORS
// ================================================================================================
const errors = {
    resultsNotYetSet: () => `loop results haven't been set yet`,
    baseResultMismatch: () => `init block dimensions conflict with segment block dimensions`,
    loopResultMismatch: () => `init block dimensions conflict with inner loop dimensions`
};
//# sourceMappingURL=LoopContext.js.map