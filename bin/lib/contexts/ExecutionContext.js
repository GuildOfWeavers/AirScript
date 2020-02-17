"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const RootContext_1 = require("./RootContext");
// EXECUTION CONTEXT CLASS
// ================================================================================================
class ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent, domain, inputs) {
        this.id = parent.getNextId();
        this.parent = parent;
        this.rank = (parent instanceof ExecutionContext ? parent.rank : 0);
        this.domain = validateDomain(parent.domain, domain);
        this.inputs = validateInputs(parent.inputs, inputs);
        this.locals = new Set();
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get base() {
        return this.parent.base;
    }
    get symbols() {
        return this.parent.symbols;
    }
    get statements() {
        return this.parent.statements;
    }
    get loopOffset() {
        return this.parent.loopOffset;
    }
    get segmentOffset() {
        return this.parent.segmentOffset;
    }
    // CONTROLLERS
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
    getCurrentBlockPath() {
        const path = [];
        let parent = this.parent;
        while (parent) {
            if (parent instanceof ExecutionContext) {
                if (isBlockContainer(parent)) {
                    path.unshift(parent.blocks.length);
                }
                parent = parent.parent;
            }
            else if (parent instanceof RootContext_1.RootContext) {
                path.unshift(0); // position within root context
                break;
            }
        }
        return path;
    }
    // SYMBOLIC REFERENCES
    // --------------------------------------------------------------------------------------------
    getSymbolReference(symbol) {
        let result;
        const info = this.symbols.get(symbol);
        if (info !== undefined) {
            result = this.base.buildLoadExpression(`load.${info.type}`, info.handle);
            if (info.subset) {
                const symbolLength = info.dimensions[0];
                if (symbolLength === 0) {
                    result = this.base.buildGetVectorElementExpression(result, info.offset);
                }
                else {
                    const startIdx = info.offset;
                    const endIdx = startIdx + symbolLength - 1;
                    result = this.base.buildSliceVectorExpression(result, startIdx, endIdx);
                }
            }
        }
        else {
            const handle = this.getLocalHandle(symbol);
            utils_1.validate(handle !== undefined, errors.undeclaredVarReference(symbol));
            result = this.base.buildLoadExpression(`load.local`, handle);
        }
        return result;
    }
    setVariableAssignment(symbol, value) {
        if (!this.hasLocal(symbol)) {
            const info = this.symbols.get(symbol);
            if (info) {
                utils_1.validate(info.type !== 'const', errors.cannotAssignToConst(symbol));
                throw new Error(`cannot assign to non-variable symbol '${symbol}'`);
            }
        }
        else {
            utils_1.validate(this.isOwnLocal(symbol), errors.cannotAssignToOuterScope(symbol));
        }
        const handle = this.buildLocalHandle(symbol);
        if (!this.locals.has(handle)) {
            this.locals.add(handle);
            this.base.addLocal(value.dimensions, handle);
        }
        const statement = this.base.buildStoreOperation(handle, value);
        this.statements.push(statement);
    }
    // CONTROL FLOW
    // --------------------------------------------------------------------------------------------
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
    // FUNCTION CALLS
    // --------------------------------------------------------------------------------------------
    buildTransitionCall() {
        const params = [
            this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.thisTraceRow),
            this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow)
        ];
        return this.base.buildCallExpression(utils_1.TRANSITION_FN_HANDLE, params);
    }
    buildDelegateCall(funcName, inputs, domain) {
        // TODO: validate domain
        //const fName = funcName + (this.procedureName === 'transition' ? TRANSITION_FN_POSTFIX : EVALUATION_FN_POSTFIX);
        const fName = funcName + utils_1.TRANSITION_FN_POSTFIX; // TODO: determine based on procedure context
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
        const maskCount = 2 - info.rank; // TODO
        masks = this.base.buildSliceVectorExpression(masks, maskOffset, maskOffset + maskCount - 1);
        statics.push(masks);
        if (info.auxLength > 0) {
            const auxOffset = 5 + info.auxOffset; // TODO
            let aux = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
            aux = this.base.buildSliceVectorExpression(aux, auxOffset, auxOffset + info.auxLength - 1);
            statics.push(aux);
        }
        const staticRow = this.base.buildMakeVectorExpression(statics);
        const callExpression = this.base.buildCallExpression(info.handle, [traceRow, staticRow]);
        return callExpression;
    }
    // LOCAL VARIABLES
    // --------------------------------------------------------------------------------------------
    hasLocal(variable) {
        if (this.locals.has(this.buildLocalHandle(variable)))
            return true;
        else
            return (this.parent.hasLocal(variable));
    }
    isOwnLocal(variable) {
        return this.locals.has(this.buildLocalHandle(variable));
    }
    getLocalHandle(variable) {
        const handle = this.buildLocalHandle(variable);
        if (this.locals.has(handle))
            return handle;
        else
            return (this.parent.getLocalHandle(variable));
    }
    buildLocalHandle(variable) {
        return `${this.id}_${variable}`;
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
    // PUBLIC METHODS DELEGATED TO ROOT CONTEXT
    // --------------------------------------------------------------------------------------------
    getNextId() {
        return this.parent.getNextId();
    }
    getLoopControllerIndex(path) {
        return this.parent.getLoopControllerIndex(path);
    }
    getSegmentControllerIndex(path) {
        return this.parent.getSegmentControllerIndex(path);
    }
}
exports.ExecutionContext = ExecutionContext;
// HELPER FUNCTIONS
// ================================================================================================
function isBlockContainer(context) {
    return (context.blocks !== undefined);
}
function validateDomain(parent, own) {
    if (!own)
        return parent;
    utils_1.validate(own[0] >= parent[0] && own[1] <= parent[1], errors.notSubdomainOfParent(own, parent));
    return own;
}
function validateInputs(parent, own) {
    if (!own)
        return parent;
    for (let value of own) {
        utils_1.validate(parent.has(value), errors.inputMissingFromParent(value));
    }
    return new Set(own);
}
// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference: (s) => `variable ${s} is referenced before declaration`,
    undefinedFuncReference: (f) => `function ${f} has not been defined`,
    invalidFuncReference: (f) => `symbol ${f} is not a function`,
    cannotAssignToConst: (c) => `cannot assign a value to a constant ${c}`,
    cannotAssignToOuterScope: (v) => `cannot assign a value to an outer scope variable ${v}`,
    inputMissingFromParent: (i) => `input '${i}' does not appear in parent context`,
    notSubdomainOfParent: (d, p) => `domain ${d} is not a subdomain of parent domain ${p}`
};
//# sourceMappingURL=ExecutionContext.js.map