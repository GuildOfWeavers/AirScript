"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const contexts_1 = require("./contexts");
// CLASS DEFINITION
// ================================================================================================
class ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base, symbols, staticRegisters) {
        this.base = base;
        this.symbols = symbols;
        this.staticRegisters = staticRegisters;
        this.statements = [];
        this.blocks = [];
        this.initializers = [];
        this.segments = [];
        this.lastBlockId = 0;
        this.delegates = [];
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get currentBlock() {
        return this.blocks[this.blocks.length - 1];
    }
    get loopOffset() {
        return this.staticRegisters.inputs;
    }
    get segmentOffset() {
        return this.staticRegisters.inputs + this.staticRegisters.loops;
    }
    get auxRegisterOffset() {
        return this.staticRegisters.inputs + this.staticRegisters.loops + this.staticRegisters.segments;
    }
    get procedureName() {
        if (this.base.handle === utils_1.TRANSITION_FN_HANDLE) {
            return 'transition';
        }
        else if (this.base.handle === utils_1.EVALUATION_FN_HANDLE) {
            return 'evaluation';
        }
        else {
            throw new Error('TODO: invalid procedure');
        }
    }
    // SYMBOLIC REFERENCES
    // --------------------------------------------------------------------------------------------
    getSymbolReference(symbol) {
        return this.currentBlock.getSymbolReference(symbol);
    }
    setVariableAssignment(symbol, value) {
        this.currentBlock.setVariableAssignment(symbol, value);
    }
    // FLOW CONTROLS
    // --------------------------------------------------------------------------------------------
    addInitializer(initResult) {
        utils_1.validate(this.initializers.length < this.staticRegisters.loops, errors.tooManyLoops(this.staticRegisters.loops));
        this.initializers.push(initResult);
        //(this.currentBlock as LoopBlockContext | LoopBaseContext).setInitializer(initResult);
    }
    addSegment(segmentResult) {
        utils_1.validate(this.segments.length < this.staticRegisters.segments, errors.tooManySegments(this.staticRegisters.segments));
        this.segments.push(segmentResult);
        //(this.currentBlock as LoopBaseContext).addSegment(segmentResult);
    }
    getLoopController(loopIdx) {
        loopIdx = this.loopOffset + loopIdx;
        let result = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, loopIdx);
        const one = this.base.buildLiteralValue(this.base.field.one);
        for (let i = loopIdx - 1; i >= this.loopOffset; i--) {
            let parent = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
            parent = this.base.buildGetVectorElementExpression(parent, i);
            parent = this.base.buildBinaryOperation('sub', one, parent);
            result = this.base.buildBinaryOperation('mul', result, parent);
        }
        return result;
    }
    getSegmentController(segmentIdx) {
        segmentIdx = this.segmentOffset + segmentIdx;
        let result = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, segmentIdx);
        return result;
    }
    buildConditionalExpression(condition, tBlock, fBlock) {
        /* TODO
        if (registerRef.isBinary) {
            throw new Error(`conditional expression must be based on a binary value`);
        }
        */
        tBlock = this.base.buildBinaryOperation('mul', tBlock, condition);
        const one = this.base.buildLiteralValue(this.base.field.one);
        condition = this.base.buildBinaryOperation('sub', one, condition);
        fBlock = this.base.buildBinaryOperation('mul', fBlock, condition);
        return this.base.buildBinaryOperation('add', tBlock, fBlock);
    }
    // STATEMENT BLOCKS
    // --------------------------------------------------------------------------------------------
    enterBlock(type) {
        const id = `${utils_1.BLOCK_ID_PREFIX}${this.lastBlockId}`;
        let context;
        if (this.blocks.length === 0) {
            const domain = { start: 0, end: 0 };
            const root = new contexts_1.RootContext(domain, this.base, this.symbols, this.staticRegisters);
            context = createContext(type, id, root);
        }
        else {
            context = createContext(type, id, this.blocks[this.blocks.length - 1]);
        }
        this.blocks.push(context);
        this.lastBlockId++;
    }
    exitBlock() {
        const context = this.blocks.pop();
        if (context instanceof contexts_1.LoopBaseContext || context instanceof contexts_1.LoopBlockContext) {
            //(this.currentBlock as LoopContext).addBlock(context.result);
        }
        else if (context instanceof contexts_1.LoopContext && this.currentBlock !== undefined) {
            //(this.currentBlock as LoopBlockContext).setLoopResult(context.result);
        }
    }
    // FUNCTION CALLS
    // --------------------------------------------------------------------------------------------
    buildTransitionCall() {
        const params = [
            this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.thisTraceRow),
            this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow)
        ];
        return this.base.buildCallExpression(utils_1.TRANSITION_FN_HANDLE, params);
    }
    addFunctionCall(funcName, inputs, domain) {
        // TODO: validate domain
        const fName = funcName + (this.procedureName === 'transition' ? utils_1.TRANSITION_FN_POSTFIX : utils_1.EVALUATION_FN_POSTFIX);
        const info = this.symbols.get(fName);
        utils_1.validate(info !== undefined, errors.undefinedFuncReference(funcName));
        utils_1.validate(info.type === 'func', errors.invalidFuncReference(funcName));
        // TODO: validate rank
        let traceRow = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.thisTraceRow);
        if (domain[0] > 0 || domain[1] < 10) { // TODO: get upper bound from somewhere
            traceRow = this.base.buildSliceVectorExpression(traceRow, domain[0], domain[1]);
        }
        // TODO: if we are in evaluator, add next state as parameter as well
        const statics = inputs.slice();
        let masks = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
        const maskOffset = this.loopOffset + info.rank;
        const maskCount = this.staticRegisters.loops - info.rank;
        masks = this.base.buildSliceVectorExpression(masks, maskOffset, maskOffset + maskCount - 1);
        statics.push(masks);
        if (info.auxLength > 0) {
            const auxOffset = this.auxRegisterOffset + info.auxOffset;
            let aux = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
            aux = this.base.buildSliceVectorExpression(aux, auxOffset, auxOffset + info.auxLength - 1);
            statics.push(aux);
        }
        const staticRow = this.base.buildMakeVectorExpression(statics);
        const callExpression = this.base.buildCallExpression(info.handle, [traceRow, staticRow]);
        this.delegates.push(callExpression);
    }
    // PASS-THROUGH METHODS
    // --------------------------------------------------------------------------------------------
    buildLiteralValue(value) {
        return this.base.buildLiteralValue(value);
    }
    buildBinaryOperation(operation, lhs, rhs) {
        return this.base.buildBinaryOperation(operation, lhs, rhs);
    }
    buildUnaryOperation(operation, operand) {
        return this.base.buildUnaryOperation(operation, operand);
    }
    buildMakeVectorExpression(elements) {
        return this.base.buildMakeVectorExpression(elements);
    }
    buildGetVectorElementExpression(source, index) {
        return this.base.buildGetVectorElementExpression(source, index);
    }
    buildSliceVectorExpression(source, start, end) {
        return this.base.buildSliceVectorExpression(source, start, end);
    }
    buildMakeMatrixExpression(elements) {
        return this.base.buildMakeMatrixExpression(elements);
    }
}
exports.ExecutionContext = ExecutionContext;
// HELPER FUNCTIONS
// ================================================================================================
function createContext(type, id, parent) {
    if (type === 'loop') {
        return new contexts_1.LoopContext(parent);
    }
    else if (type === 'loopBlock') {
        return new contexts_1.LoopBlockContext(parent);
    }
    else if (type === 'loopBase') {
        return new contexts_1.LoopBaseContext(parent);
    }
    else {
        throw new Error('TODO: nothing');
    }
}
// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference: (s) => `variable ${s} is referenced before declaration`,
    undefinedFuncReference: (f) => `function ${f} has not been defined`,
    invalidFuncReference: (f) => `symbol ${f} is not a function`,
    cannotAssignToConst: (c) => `cannot assign a value to a constant ${c}`,
    cannotAssignToOuterScope: (v) => `cannot assign a value to an outer scope variable ${v}`,
    tooManyLoops: (e) => `number of input loops cannot exceed ${e}`,
    tooManySegments: (e) => `number of segment loops cannot exceed ${e}`
};
//# sourceMappingURL=ExecutionContext.js.map