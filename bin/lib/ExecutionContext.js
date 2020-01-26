"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base, symbols, functions, staticRegisters) {
        this.base = base;
        this.symbols = symbols;
        this.functions = functions;
        this.staticRegisters = staticRegisters;
        this.statements = [];
        this.blocks = [];
        this.initializers = [];
        this.segments = [];
        this.lastBlockId = 0;
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
            const block = this.findLocalVariableBlock(symbol);
            utils_1.validate(block !== undefined, errors.undeclaredVarReference(symbol));
            result = block.loadLocal(symbol);
        }
        return result;
    }
    setVariableAssignment(symbol, value) {
        let block = this.findLocalVariableBlock(symbol);
        if (!block) {
            const info = this.symbols.get(symbol);
            if (info) {
                utils_1.validate(info.type !== 'const', errors.cannotAssignToConst(symbol));
                throw new Error(`cannot assign to non-variable symbol '${symbol}'`);
            }
            block = this.currentBlock;
        }
        utils_1.validate(block === this.currentBlock, errors.cannotAssignToOuterScope(symbol));
        const statement = block.setLocal(symbol, value);
        this.statements.push(statement);
    }
    // FLOW CONTROLS
    // --------------------------------------------------------------------------------------------
    addInitializer(initResult) {
        utils_1.validate(this.initializers.length < this.staticRegisters.loops, errors.tooManyLoops(this.staticRegisters.loops));
        this.initializers.push(initResult);
    }
    addSegment(segmentResult) {
        utils_1.validate(this.segments.length < this.staticRegisters.segments, errors.tooManySegments(this.staticRegisters.segments));
        this.segments.push(segmentResult);
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
    enterBlock() {
        this.blocks.push(new ExpressionBlock(this.lastBlockId, this.base));
        this.lastBlockId++;
    }
    exitBlock() {
        this.blocks.pop();
    }
    findLocalVariableBlock(variable) {
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            if (this.blocks[i].hasLocal(variable))
                return this.blocks[i];
        }
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
    buildFunctionCall(func, params) {
        const info = this.functions.get(func);
        utils_1.validate(info !== undefined, errors.undefinedFuncReference(func));
        return this.base.buildCallExpression(info.handle, params);
    }
}
exports.ExecutionContext = ExecutionContext;
// EXPRESSION BLOCK CLASS
// ================================================================================================
class ExpressionBlock {
    constructor(id, context) {
        this.id = `${utils_1.BLOCK_ID_PREFIX}${id}`;
        this.locals = new Map();
        this.context = context;
    }
    hasLocal(variable) {
        return this.locals.has(`${this.id}_${variable}`);
    }
    setLocal(variable, value) {
        const handle = `${this.id}_${variable}`;
        if (!this.locals.has(handle)) {
            this.locals.set(handle, this.locals.size);
            this.context.addLocal(value.dimensions, handle);
        }
        return this.context.buildStoreOperation(handle, value);
    }
    loadLocal(variable) {
        const handle = `${this.id}_${variable}`;
        utils_1.validate(this.locals.has(handle), errors.undeclaredVarReference(variable));
        return this.context.buildLoadExpression(`load.local`, handle);
    }
    getLocalIndex(variable) {
        return this.locals.get(`${this.id}_${variable}`);
    }
}
// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference: (s) => `variable ${s} is referenced before declaration`,
    undefinedFuncReference: (f) => `function ${f} has not been defined`,
    cannotAssignToConst: (c) => `cannot assign a value to a constant ${c}`,
    cannotAssignToOuterScope: (v) => `cannot assign a value to an outer scope variable ${v}`,
    tooManyLoops: (e) => `number of input loops cannot exceed ${e}`,
    tooManySegments: (e) => `number of segment loops cannot exceed ${e}`
};
//# sourceMappingURL=ExecutionContext.js.map