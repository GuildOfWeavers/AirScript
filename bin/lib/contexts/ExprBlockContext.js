"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Context_1 = require("./Context");
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class ExprBlockContext extends Context_1.ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(id, parent) {
        super(id, parent);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get result() {
        utils_1.validate(this._result !== undefined, errors.resultNotYetSet());
        return this._result;
    }
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    setResult(blockResult) {
        utils_1.validate(this._result === undefined, errors.resultAlreadySet());
        this._result = blockResult;
    }
}
exports.ExprBlockContext = ExprBlockContext;
// ERRORS
// ================================================================================================
const errors = {
    resultAlreadySet: () => `block result has already been set`,
    resultNotYetSet: () => `block result hasn't been set yet`
};
//# sourceMappingURL=ExprBlockContext.js.map