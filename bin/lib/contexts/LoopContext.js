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
    getLoopController() {
        const path = this.getCurrentBlockPath();
        const loopIdx = this.loopOffset + this.getLoopControllerIndex(path);
        let result = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, loopIdx);
        return result;
    }
    getSegmentController(segmentIdx) {
        const path = this.getCurrentBlockPath();
        path.push(segmentIdx);
        segmentIdx = this.segmentOffset + this.getSegmentControllerIndex(path);
        let result = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, segmentIdx);
        return result;
    }
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
    addDelegateBlock(delegateName, inputs, domain) {
        const procedureName = this.procedureName;
        const funcName = `${delegateName}_${procedureName}`;
        const info = this.symbols.get(funcName);
        utils_1.validate(info !== undefined, errors.undefinedFuncReference(delegateName));
        utils_1.validate(info.type === 'func', errors.invalidFuncReference(delegateName));
        // TODO: validate rank
        utils_1.validate(utils_1.isSubdomain(this.domain, domain), errors.invalidFuncDomain(delegateName, this.domain));
        // build function parameters
        const params = [];
        // add parameter for current state
        params.push(this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.thisTraceRow));
        if (domain[0] > 0 || domain[1] < this.traceWidth) {
            params[0] = this.base.buildSliceVectorExpression(params[0], domain[0], domain[1]);
        }
        // if we are in an evaluator, add next state as parameter as well
        if (procedureName === 'evaluation') {
            params.push(this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.nextTraceRow));
            if (domain[0] > 0 || domain[1] < this.traceWidth) {
                params[1] = this.base.buildSliceVectorExpression(params[1], domain[0], domain[1]);
            }
        }
        // build parameter for static registers
        const statics = [];
        const controller = this.getLoopController();
        const inputsVector = this.base.buildMakeVectorExpression(inputs);
        statics.push(this.base.buildBinaryOperation('mul', inputsVector, controller));
        let masks = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
        const maskOffset = this.loopOffset + info.rank;
        const maskCount = 2 - info.rank; // TODO
        masks = this.base.buildSliceVectorExpression(masks, maskOffset, maskOffset + maskCount - 1);
        statics.push(masks);
        if (info.auxLength > 0) {
            const auxOffset = this.auxRegistersOffset + info.auxOffset;
            const aux = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
            statics.push(this.base.buildSliceVectorExpression(aux, auxOffset, auxOffset + info.auxLength - 1));
        }
        params.push(this.base.buildMakeVectorExpression(statics));
        this.blocks.push(this.base.buildCallExpression(info.handle, params));
    }
}
exports.LoopContext = LoopContext;
// ERRORS
// ================================================================================================
const errors = {
    resultsNotYetSet: () => `loop results haven't been set yet`,
    baseResultMismatch: () => `init block dimensions conflict with segment block dimensions`,
    loopResultMismatch: () => `init block dimensions conflict with inner loop dimensions`,
    invalidFuncReference: (f) => `symbol ${f} is not a function`,
    invalidFuncDomain: (f, p) => `domain of function ${f} is outside of parent domain ${p}`,
    undefinedFuncReference: (f) => `function ${f} has not been defined`
};
//# sourceMappingURL=LoopContext.js.map