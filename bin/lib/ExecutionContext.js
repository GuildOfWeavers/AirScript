"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base, procedures, loopCount) {
        this.base = base;
        this.statements = [];
        this.blocks = [];
        this.lastBlockId = 0;
        this.procedures = procedures;
        this.loopCount = loopCount;
        this.constants = new Map();
        this.base.constants.forEach((c, i) => this.constants.set(c.handle.substring(1), i));
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get currentBlock() {
        return this.blocks[this.blocks.length - 1];
    }
    // SYMBOLIC REFERENCES
    // --------------------------------------------------------------------------------------------
    getSymbolReference(symbol) {
        let result;
        if (symbol.startsWith('$')) {
            let param = `$_${symbol.substring(1, 2)}`;
            result = this.base.buildLoadExpression(`load.param`, param);
            if (symbol.length > 2) {
                let index = Number(symbol.substring(2));
                result = this.base.buildGetVectorElementExpression(result, index);
            }
        }
        else {
            let index = this.constants.get(symbol);
            if (index !== undefined) {
                result = this.base.buildLoadExpression(`load.const`, index);
            }
            else {
                const block = this.findLocalVariableBlock(symbol);
                utils_1.validate(block !== undefined, errors.undeclaredVarReference(symbol));
                result = block.loadLocal(symbol);
            }
        }
        return result;
    }
    setVariableAssignment(symbol, value) {
        let block = this.findLocalVariableBlock(symbol);
        if (!block) {
            utils_1.validate(!this.constants.has(symbol), errors.cannotAssignToConst(symbol));
            block = this.currentBlock;
        }
        utils_1.validate(block === this.currentBlock, errors.cannotAssignToOuterScope(symbol));
        const statement = block.setLocal(symbol, value);
        this.statements.push(statement);
    }
    // FLOW CONTROLS
    // --------------------------------------------------------------------------------------------
    getLoopController(loopIdx) {
        let result = this.base.buildLoadExpression('load.param', utils_1.CONTROLLER_NAME);
        result = this.base.buildGetVectorElementExpression(result, loopIdx);
        for (let i = loopIdx - 1; i >= 0; i++) {
            let parent = this.base.buildLoadExpression('load.param', utils_1.CONTROLLER_NAME);
            parent = this.base.buildGetVectorElementExpression(result, loopIdx);
            parent = this.base.buildBinaryOperation('sub', this.base.buildLiteralValue(1n), parent); // TODO: get from field
            result = this.base.buildBinaryOperation('mul', result, parent);
        }
        return result;
    }
    getSegmentModifier(segmentIdx) {
        let result = this.base.buildLoadExpression('load.param', utils_1.CONTROLLER_NAME);
        result = this.base.buildGetVectorElementExpression(result, this.loopCount + segmentIdx);
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
    buildTransitionFunctionCall() {
        const params = this.procedures.transition.params.map(p => {
            return this.base.buildLoadExpression('load.param', p.name);
        });
        return this.buildFunctionCall(this.procedures.transition.name, params);
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
        return this.base.buildCallExpression(func, params);
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
    cannotAssignToConst: (c) => `cannot assign a value to a constant ${c}`,
    cannotAssignToOuterScope: (v) => `cannot assign a value to an outer scope variable ${v}`
};
//# sourceMappingURL=ExecutionContext.js.map