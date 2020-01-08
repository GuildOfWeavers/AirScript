// IMPORTS
// ================================================================================================
import {
    ProcedureContext, Expression, LiteralValue, BinaryOperation, UnaryOperation, MakeVector,
    GetVectorElement, SliceVector, MakeMatrix, StoreOperation, LoadExpression
} from "@guildofweavers/air-assembly";

// INTERFACES
// ================================================================================================
interface RegisterInfo {
    readonly type   : 'trace' | 'static';
    readonly index  : number;
}

// CLASS DEFINITION
// ================================================================================================
export class ExecutionContext {

    readonly base               : ProcedureContext;
    readonly constants          : Map<string, number>;
    readonly registers          : Map<string, RegisterInfo>;
    readonly blocks             : ExpressionBlock[];
    readonly statements         : StoreOperation[];

    readonly inputCount         : number;
    readonly segmentCount       : number;

    private lastBlockId         : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(base: ProcedureContext, inputCount: number, segmentCount: number) {
        this.base = base;
        this.constants = new Map();
        this.registers = new Map();
        this.statements = [];
        this.blocks = [];
        this.lastBlockId = 0;

        this.base.constants.forEach((c, i) => this.constants.set(c.handle!.substring(1), i));
        this.registers.set(`$r`, { type: 'trace', index: 0 });
        this.registers.set(`$n`, { type: 'trace', index: 1 });
        this.registers.set(`$i`, { type: 'static', index: 0 });
        this.registers.set(`$k`, { type: 'static', index: 0 });

        this.inputCount = inputCount;
        this.segmentCount = segmentCount;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get currentBlock(): ExpressionBlock {
        return this.blocks[this.blocks.length - 1];
    }

    get kRegisterOffset(): number {
        return this.inputCount + this.segmentCount;
    }

    // SYMBOLIC REFERENCES
    // --------------------------------------------------------------------------------------------
    getSymbolReference(symbol: string): Expression {
        let result: Expression;
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

    setVariableAssignment(symbol: string, value: Expression): void {
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
    getLoopControlExpression(loopIdx: number): Expression {
        const registerOffset = this.inputCount;
        let result: Expression = this.base.buildLoadExpression('load.static', 0);
        result = this.base.buildGetVectorElementExpression(result, registerOffset + loopIdx);
        return result;
    }

    getControlExpression(segmentIdx: number): Expression {
        const registerOffset = this.inputCount;
        let result: Expression = this.base.buildLoadExpression('load.static', 0);
        result = this.base.buildGetVectorElementExpression(result, registerOffset + segmentIdx);
        return result;
    }

    buildConditionalExpression(condition: Expression, tBlock: Expression, fBlock: Expression): Expression {
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

    exitBlock(): void {
        this.blocks.pop()!;
    }

    private findLocalVariableBlock(variable: string): ExpressionBlock | undefined {
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            if (this.blocks[i].hasLocal(variable)) return this.blocks[i];
        }
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

// EXPRESSION BLOCK CLASS
// ================================================================================================
class ExpressionBlock {

    readonly id     : number;
    readonly locals : Map<string, number>;
    readonly context: ProcedureContext;

    constructor (id: number, context: ProcedureContext) {
        this.id = id;
        this.locals = new Map();
        this.context = context;
    }

    hasLocal(variable: string): boolean {
        return this.locals.has(`b${this.id}_${variable}`);
    }

    setLocal(variable: string, value: Expression): StoreOperation {
        variable = `b${this.id}_${variable}`;
        if (!this.locals.has(variable)) {
            this.locals.set(variable, this.locals.size);
            this.context.addLocal(value.dimensions, `$${variable}`);
        }
        return this.context.buildStoreOperation(`$${variable}`, value);
    }

    loadLocal(variable: string): LoadExpression {
        variable = `b${this.id}_${variable}`;
        if (!this.locals.has(variable)) {
            throw new Error(`TODO: no local var`);
        }
        return this.context.buildLoadExpression(`load.local`, `$${variable}`);
    }

    getLocalIndex(variable: string): number | undefined {
        return this.locals.get(`b${this.id}_${variable}`);
    }
}