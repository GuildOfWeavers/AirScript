"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class ExecutionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base) {
        this.base = base;
        this.symbolMap = new Map();
        // TODO: add constants to the symbol map
        this.symbolMap.set('alpha', { type: 'const', index: 0 });
        this.symbolMap.set(`$r`, { type: 'trace', index: 0 });
        this.symbolMap.set(`$n`, { type: 'trace', index: 1 });
        this.symbolMap.set(`$k`, { type: 'static', index: 0 });
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
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
                const index = Number(symbol.substring(2));
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