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
        if (domain) {
            // TODO: narrow domain
            this.domain = domain;
        }
        else {
            this.domain = parent.domain;
        }
        if (inputs) {
            // TODO: make sure the inputs were narrowed correctly
            this.inputs = new Set(inputs);
        }
        else {
            this.inputs = parent.inputs;
        }
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
                const blocks = parent.blockResults;
                if (blocks) {
                    path.unshift(blocks.length);
                }
                parent = parent.parent;
            }
            else if (parent instanceof RootContext_1.RootContext) {
                path.unshift(0); // position withing root context
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
            utils_1.validate(this.hasLocal(symbol), errors.undeclaredVarReference(symbol));
            result = this.base.buildLoadExpression(`load.local`, this.buildLocalHandle(symbol));
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
    addFunctionCall(funcName, inputs, domain) {
        // TODO
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
// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference: (s) => `variable ${s} is referenced before declaration`,
    cannotAssignToConst: (c) => `cannot assign a value to a constant ${c}`,
    cannotAssignToOuterScope: (v) => `cannot assign a value to an outer scope variable ${v}`,
};
//# sourceMappingURL=ExecutionContext.js.map