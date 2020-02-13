"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Context_1 = require("./Context");
// CLASS DECLARATION
// ================================================================================================
class LoopBaseContext extends Context_1.ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent) {
        super(parent);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    buildResult(initResult, segmentResults) {
        // initializer result
        const controller = this.getLoopController(this.rank);
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
        return this.base.buildLoadExpression(`load.local`, resultHandle);
    }
}
exports.LoopBaseContext = LoopBaseContext;
//# sourceMappingURL=LoopBaseContext.js.map