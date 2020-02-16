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
        this.blockResults = [];
        this.rank = (parent instanceof ExecutionContext_1.ExecutionContext ? parent.rank + 1 : 0);
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
    setInputs(inputs) {
        // TODO: implement
    }
    addBaseBlock(initResult, segmentResults) {
        // initializer result
        const controller = this.getLoopController();
        let result = this.base.buildBinaryOperation('mul', initResult, controller);
        // segment results
        segmentResults.forEach((expression, i) => {
            const resultControl = this.getSegmentController(i);
            expression = this.base.buildBinaryOperation('mul', expression, resultControl);
            result = this.base.buildBinaryOperation('add', result, expression);
        });
        // store result in a local variable
        const resultHandle = `${this.id}t`; // TODO?
        this.base.addLocal(initResult.dimensions, resultHandle); // TODO: better way to get dimensions
        this.statements.push(this.base.buildStoreOperation(resultHandle, result));
        this.blockResults.push(this.base.buildLoadExpression(`load.local`, resultHandle));
    }
    addLoopBlock(initResult, loopResult) {
        // TODO: validate dimensions
        // initializer result
        const controller = this.getLoopController();
        initResult = this.base.buildBinaryOperation('mul', initResult, controller);
        // loop result
        const one = this.base.buildLiteralValue(this.base.field.one);
        const invController = this.base.buildBinaryOperation('sub', one, controller);
        loopResult = this.base.buildBinaryOperation('mul', loopResult, invController);
        // combine results and store them in a local variable
        const resultHandle = `${this.id}t`; // TODO?
        this.base.addLocal(initResult.dimensions, resultHandle); // TODO: better way to get dimensions
        const result = this.base.buildBinaryOperation('add', initResult, loopResult);
        this.statements.push(this.base.buildStoreOperation(resultHandle, result));
        this.blockResults.push(this.base.buildLoadExpression(`load.local`, resultHandle));
    }
}
exports.LoopContext = LoopContext;
// ERRORS
// ================================================================================================
const errors = {
    resultsNotYetSet: () => `loop results haven't been set yet`
};
//# sourceMappingURL=LoopContext.js.map