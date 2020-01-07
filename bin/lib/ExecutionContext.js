"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base, inputCount, loopCount, segmentCount) {
        this.base = base;
        this.symbolMap = new Map();
        this.lastBlockId = 0;
        this.blocks = [];
        this.base.constants.forEach((c, i) => {
            const name = c.handle.substring(1);
            this.symbolMap.set(name, { type: 'const', index: i });
        });
        this.symbolMap.set(`$r`, { type: 'trace', index: 0 });
        this.symbolMap.set(`$n`, { type: 'trace', index: 1 });
        this.symbolMap.set(`$i`, { type: 'static', index: 0 });
        this.symbolMap.set(`$k`, { type: 'static', index: 0 });
        this.inputCount = inputCount;
        this.loopCount = loopCount;
        this.segmentCount = segmentCount;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get currentBlock() {
        return this.blocks[this.blocks.length - 1];
    }
    get kRegisterOffset() {
        return this.inputCount + this.loopCount + this.segmentCount;
    }
    // SYMBOLIC REFERENCES
    // --------------------------------------------------------------------------------------------
    getSymbolReference(symbol) {
        let result;
        if (symbol.startsWith('$')) {
            const info = this.symbolMap.get(symbol.substring(0, 2));
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
            const info = this.symbolMap.get(symbol);
            if (!info) {
                throw new Error(`TODO`);
            }
            result = this.base.buildLoadExpression(`load.${info.type}`, info.index);
        }
        return result;
    }
    setVariableAssignment(symbol, value) {
        const block = this.blocks[this.blocks.length - 1];
        //symbol = `b${block.id}_${symbol}`;
        let info = this.symbolMap.get(`${symbol}`);
        if (info) {
            if (info.type !== 'local') {
                throw new Error(`TODO`);
            }
        }
        else {
            info = { type: 'local', index: this.base.locals.length };
            this.symbolMap.set(symbol, info);
            this.base.addLocal(value.dimensions, `$${symbol}`);
        }
        return this.base.buildStoreOperation(info.index, value);
    }
    getLoopControlExpression(loopIdx) {
        const registerOffset = this.inputCount;
        let result = this.base.buildLoadExpression('load.static', 0);
        result = this.base.buildGetVectorElementExpression(result, registerOffset + loopIdx);
        return result;
    }
    getControlExpression(segmentIdx) {
        const registerOffset = this.inputCount + this.loopCount;
        let result = this.base.buildLoadExpression('load.static', 0);
        result = this.base.buildGetVectorElementExpression(result, registerOffset + segmentIdx);
        return result;
    }
    enterBlock() {
        this.blocks.push({ id: this.lastBlockId, locals: new Map() });
        this.lastBlockId++;
    }
    exitBlock() {
        this.blocks.pop();
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
//# sourceMappingURL=ExecutionContext.js.map