// IMPORTS
// ================================================================================================
import {
    ProcedureContext, Expression, LiteralValue, BinaryOperation, UnaryOperation, MakeVector,
    GetVectorElement, SliceVector, MakeMatrix, StoreOperation
} from "@guildofweavers/air-assembly";

// INTERFACES
// ================================================================================================
interface SymbolInfo {
    readonly type   : 'const' | 'local' | 'trace' | 'static';
    readonly index  : number;
}

interface BlockInfo {
    readonly id     : number;
    readonly locals : Map<string, number>;
}

// CLASS DEFINITION
// ================================================================================================
export class ExecutionContext {

    readonly base               : ProcedureContext;
    readonly symbolMap          : Map<string, SymbolInfo>;
    readonly blocks             : BlockInfo[];

    readonly inputCount         : number;
    readonly loopCount          : number;
    readonly segmentCount       : number;

    private lastBlockId         : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base: ProcedureContext, inputCount: number, loopCount: number, segmentCount: number) {
        this.base = base;
        this.symbolMap = new Map();
        this.lastBlockId = 0;
        this.blocks = [];

        this.base.constants.forEach((c, i) => {
            const name = c.handle!.substring(1);
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
    get currentBlock(): BlockInfo {
        return this.blocks[this.blocks.length - 1];
    }

    get kRegisterOffset(): number {
        return this.inputCount + this.loopCount + this.segmentCount;
    }

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

    setVariableAssignment(symbol: string, value: Expression): StoreOperation {
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

    getLoopControlExpression(loopIdx: number): Expression {
        const registerOffset = this.inputCount;
        let result: Expression = this.base.buildLoadExpression('load.static', 0);
        result = this.base.buildGetVectorElementExpression(result, registerOffset + loopIdx);
        return result;
    }

    getControlExpression(segmentIdx: number): Expression {
        const registerOffset = this.inputCount + this.loopCount;
        let result: Expression = this.base.buildLoadExpression('load.static', 0);
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
