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
        let result = (this.blocks.length === 1)
            ? this.blocks[0]
            : this.base.buildMakeVectorExpression(this.blocks);
        if (result.isScalar) {
            result = this.base.buildMakeVectorExpression([result]);
        }
        return result;
    }
    // PUBLIC METHODS
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
    addDelegateBlock(delegateName, inputs, domain) {
        const procedureName = this.procedureName;
        const funcName = `${delegateName}_${procedureName}`;
        const info = this.symbols.get(funcName);
        utils_1.validate(info !== undefined, errors.undefinedFunctionRef(delegateName));
        utils_1.validate(info.type === 'func', errors.invalidFunctionRef(delegateName));
        utils_1.validate(utils_1.isSubdomain(this.domain, domain), errors.invalidFunctionDomain(delegateName, this.domain));
        const depth = this.getMaxInputRank() - this.rank;
        //validate(depth === info.rank, errors.invalidFunctionRank(funcName));
        utils_1.validate(inputs.length === info.inputCount, errors.wrongFunctionParamCount(funcName, info.inputCount));
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
        statics.push(this.base.buildMakeVectorExpression(inputs));
        const masks = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
        const maskOffset = this.loopOffset + this.getLoopControllerIndex(this.getCurrentBlockPath());
        statics.push(this.base.buildSliceVectorExpression(masks, maskOffset, maskOffset + info.maskCount - 1));
        if (info.auxCount > 0) {
            const auxOffset = this.auxRegistersOffset + info.auxOffset;
            const aux = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
            statics.push(this.base.buildSliceVectorExpression(aux, auxOffset, auxOffset + info.auxCount - 1));
        }
        params.push(this.base.buildMakeVectorExpression(statics));
        this.blocks.push(this.base.buildCallExpression(info.handle, params));
    }
    // PRIVATE METHODS
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
    getMaxInputRank() {
        let rank = 0;
        for (let input of this.inputs) {
            let inputRank = this.getInputRank(input);
            if (inputRank > rank) {
                rank = inputRank;
            }
        }
        return rank;
    }
}
exports.LoopContext = LoopContext;
// ERRORS
// ================================================================================================
const errors = {
    resultsNotYetSet: () => `loop results haven't been set yet`,
    baseResultMismatch: () => `init block dimensions conflict with segment block dimensions`,
    loopResultMismatch: () => `init block dimensions conflict with inner loop dimensions`,
    undefinedFunctionRef: (f) => `function ${f} has not been defined`,
    invalidFunctionRef: (f) => `symbol ${f} is not a function`,
    invalidFunctionDomain: (f, p) => `domain of function ${f} is outside of parent domain ${p}`,
    invalidFunctionRank: (f) => `function ${f} cannot be called from the specified context: rank mismatch`,
    wrongFunctionParamCount: (f, c) => `invalid number of parameters for function ${f}, ${c} parameters expected`
};
//# sourceMappingURL=LoopContext.js.map