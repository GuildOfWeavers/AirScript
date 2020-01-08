"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base, inputCount, segmentCount) {
        this.base = base;
        this.constants = new Map();
        this.registers = new Map();
        this.statements = [];
        this.blocks = [];
        this.lastBlockId = 0;
        this.base.constants.forEach((c, i) => this.constants.set(c.handle.substring(1), i));
        this.registers.set(`$r`, { type: 'trace', index: 0 });
        this.registers.set(`$n`, { type: 'trace', index: 1 });
        this.registers.set(`$i`, { type: 'static', index: 0 });
        this.registers.set(`$k`, { type: 'static', index: 0 });
        this.inputCount = inputCount;
        this.segmentCount = segmentCount;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get currentBlock() {
        return this.blocks[this.blocks.length - 1];
    }
    get kRegisterOffset() {
        return this.inputCount + this.segmentCount;
    }
    // SYMBOLIC REFERENCES
    // --------------------------------------------------------------------------------------------
    getSymbolReference(symbol) {
        let result;
        if (symbol.startsWith('$')) {
            const info = this.registers.get(symbol.substring(0, 2));
            if (!info) {
                throw new Error(`TODO`);
            }
            result = this.base.buildLoadExpression(`load.${info.type}`, info.index);
            if (symbol.length > 2) {
                let index = Number(symbol.substring(2));
                if (symbol.startsWith('$k')) {
                    index += this.kRegisterOffset;
                }
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
                if (!block) {
                    throw new Error(`TODO: local var not found`);
                }
                result = block.loadLocal(symbol);
            }
        }
        return result;
    }
    setVariableAssignment(symbol, value) {
        let block = this.findLocalVariableBlock(symbol);
        if (!block) {
            if (this.constants.has(symbol)) {
                throw new Error(`TODO: can't assign to const`);
            }
            block = this.currentBlock;
        }
        else if (block !== this.currentBlock) {
            throw new Error(`TODO: can't assign out of scope`);
        }
        const statement = block.setLocal(symbol, value);
        this.statements.push(statement);
    }
    // FLOW CONTROLS
    // --------------------------------------------------------------------------------------------
    getLoopControlExpression(loopIdx) {
        const registerOffset = this.inputCount;
        let result = this.base.buildLoadExpression('load.static', 0);
        result = this.base.buildGetVectorElementExpression(result, registerOffset + loopIdx);
        return result;
    }
    getControlExpression(segmentIdx) {
        const registerOffset = this.inputCount;
        let result = this.base.buildLoadExpression('load.static', 0);
        result = this.base.buildGetVectorElementExpression(result, registerOffset + segmentIdx);
        return result;
    }
    buildConditionalExpression(condition, tBlock, fBlock) {
        /* TODO
        if (registerRef.isBinary) {
            throw new Error(`conditional expression must be based on a binary register`);
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
}
exports.ExecutionContext = ExecutionContext;
// EXPRESSION BLOCK CLASS
// ================================================================================================
class ExpressionBlock {
    constructor(id, context) {
        this.id = id;
        this.locals = new Map();
        this.context = context;
    }
    hasLocal(variable) {
        return this.locals.has(`b${this.id}_${variable}`);
    }
    setLocal(variable, value) {
        variable = `b${this.id}_${variable}`;
        if (!this.locals.has(variable)) {
            this.locals.set(variable, this.locals.size);
            this.context.addLocal(value.dimensions, `$${variable}`);
        }
        return this.context.buildStoreOperation(`$${variable}`, value);
    }
    loadLocal(variable) {
        variable = `b${this.id}_${variable}`;
        if (!this.locals.has(variable)) {
            throw new Error(`TODO: no local var`);
        }
        return this.context.buildLoadExpression(`load.local`, `$${variable}`);
    }
    getLocalIndex(variable) {
        return this.locals.get(`b${this.id}_${variable}`);
    }
}
//# sourceMappingURL=ExecutionContext.js.map