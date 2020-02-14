"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Context_1 = require("./Context");
// CLASS DEFINITION
// ================================================================================================
class LoopBlockContext extends Context_1.ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent, domain) {
        super(parent, domain);
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    buildResult(initResult, loopResult) {
        // TODO: validate dimensions
        const id = this.getLoopControllerId();
        // initializer result
        const controller = this.getLoopController(this.rank);
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
        return this.base.buildLoadExpression(`load.local`, resultHandle);
    }
}
exports.LoopBlockContext = LoopBlockContext;
//# sourceMappingURL=LoopBlockContext.js.map