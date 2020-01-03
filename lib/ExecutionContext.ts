// IMPORTS
// ================================================================================================
import {
    ProcedureContext, Expression, LiteralValue, BinaryOperation, UnaryOperation, MakeVector,
    GetVectorElement, SliceVector, MakeMatrix, StoreOperation,
} from "@guildofweavers/air-assembly";

// INTERFACES
// ================================================================================================
interface SymbolInfo {
    readonly type   : 'const' | 'local' | 'trace' | 'static';
    readonly index  : number;
}

// CLASS DEFINITION
// ================================================================================================
export class ExecutionContext {

    readonly base       : ProcedureContext;
    readonly symbolMap  : Map<string, SymbolInfo>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base: ProcedureContext) {
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
    getSymbolReference(symbol: string): Expression {
        let result: Expression;
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

    setVariableAssignment(symbol: string, value: Expression): StoreOperation {
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
    buildLiteralValue(value: bigint | bigint[] | bigint[]): LiteralValue {
        return this.base.buildLiteralValue(value);
    }

    buildBinaryOperation(operation: string, lhs: Expression, rhs: Expression): BinaryOperation {
        return this.base.buildBinaryOperation(operation, lhs, rhs);
    }

    buildUnaryOperation(operation: string, operand: Expression): UnaryOperation {
        return this.base.buildUnaryOperation(operation, operand);
    }

    buildMakeVectorExpression(elements: Expression[]): MakeVector {
        return this.base.buildMakeVectorExpression(elements);
    }

    buildGetVectorElementExpression(source: Expression, index: number): GetVectorElement {
        return this.base.buildGetVectorElementExpression(source, index);
    }

    buildSliceVectorExpression(source: Expression, start: number, end: number): SliceVector {
        return this.base.buildSliceVectorExpression(source, start, end);
    }

    buildMakeMatrixExpression(elements: Expression[][]): MakeMatrix {
        return this.base.buildMakeMatrixExpression(elements);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
