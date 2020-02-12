"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Context_1 = require("./Context");
const utils_1 = require("../utils");
// CLASS DECLARATION
// ================================================================================================
class LoopBaseContext extends Context_1.ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(id, parent) {
        super(id, parent);
        this._segmentResults = [];
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get result() {
        utils_1.validate(this._initResult !== undefined, errors.initResultNotYetSet());
        utils_1.validate(this._segmentResults.length > 0, errors.segmentsNotYetSet());
        if (this._result)
            return this._result;
        // initializer result
        const controller = this.getLoopController(this.rank);
        let result = this.base.buildBinaryOperation('mul', this._initResult, controller);
        // segment results
        this._segmentResults.forEach((expression, i) => {
            const resultControl = this.getSegmentController(i);
            expression = this.base.buildBinaryOperation('mul', expression, resultControl);
            result = this.base.buildBinaryOperation('add', result, expression);
        });
        // store result in a local variable
        const resultHandle = `${this.id}t`; // TODO?
        this.base.addLocal(this._initResult.dimensions, resultHandle); // TODO: better way to get dimensions
        this.statements.push(this.base.buildStoreOperation(resultHandle, result));
        this._result = this.base.buildLoadExpression(`load.local`, resultHandle);
        return this._result;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    setInitializer(initResult) {
        utils_1.validate(this._initResult === undefined, errors.initResultAlreadySet());
        // TODO: validate against domain
        this._initResult = initResult;
    }
    addSegment(segmentResult) {
        // TODO: validate against domain
        this._segmentResults.push(segmentResult);
    }
}
exports.LoopBaseContext = LoopBaseContext;
// ERRORS
// ================================================================================================
const errors = {
    initResultAlreadySet: () => `loop base initializer result has already been set`,
    initResultNotYetSet: () => `loop base initializer result hasn't been set yet`,
    segmentsNotYetSet: () => `loop base segments haven't been set yet`
};
//# sourceMappingURL=LoopBaseContext.js.map