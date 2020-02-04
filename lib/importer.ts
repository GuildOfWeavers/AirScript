// IMPORTS
// ================================================================================================
import { AirSchema, ExpressionVisitor, ExecutionContext, Expression, LiteralValue, BinaryOperation,
    UnaryOperation, MakeVector, GetVectorElement, SliceVector, MakeMatrix, LoadExpression, CallExpression
} from "@guildofweavers/air-assembly";

// INTERFACES
// ================================================================================================
export interface ImportOffsets {
    readonly constants  : number;
    readonly functions  : number;
    readonly statics    : number;
}

// PUBLIC FUNCTIONS
// ================================================================================================
export function importConstants(from: AirSchema, to: AirSchema): void {
    for (let constant of from.constants) {
        to.addConstant(constant.value.value);
    }
}

export function importFunctions(from: AirSchema, to: AirSchema, offsets: ImportOffsets): void {
    const importer = new ExpressionImporter(offsets);
    for (let func of from.functions) {
        let ctx = to.createFunctionContext(func.result.dimensions);
        func.params.forEach(param => ctx.addParam(param.dimensions, param.handle));
        func.locals.forEach(local => ctx.addLocal(local.dimensions, local.handle));
        const statements = func.statements.map(s => {
            const expression = importer.visit(s.expression, ctx);
            return ctx.buildStoreOperation(s.handle || s.target, expression);
        });
        const result = importer.visit(func.result, ctx);
        to.addFunction(ctx, statements, result);
    }
}

// EXPRESSION IMPORTER
// ================================================================================================
class ExpressionImporter extends ExpressionVisitor<Expression> {

    readonly constOffset: number;
    readonly funcOffset : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(offsets: ImportOffsets) {
        super();
        this.constOffset = offsets.constants;
        this.funcOffset = offsets.functions;
    }

    // LITERALS
    // --------------------------------------------------------------------------------------------
    literalValue(e: LiteralValue): Expression {
        return e;
    }

    // OPERATIONS
    // --------------------------------------------------------------------------------------------
    binaryOperation(e: BinaryOperation, ctx: ExecutionContext): Expression {
        const lhs = this.visit(e.lhs, ctx);
        const rhs = this.visit(e.rhs, ctx);
        return ctx.buildBinaryOperation(e.operation, lhs, rhs);
    }

    unaryOperation(e: UnaryOperation, ctx: ExecutionContext): Expression {
        const operand = this.visit(e.operand, ctx);
        return ctx.buildUnaryOperation(e.operation, operand);
    }

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    makeVector(e: MakeVector, ctx: ExecutionContext): Expression {
        const elements = e.elements.map(e => this.visit(e, ctx));
        return ctx.buildMakeVectorExpression(elements);
    }

    getVectorElement(e: GetVectorElement, ctx: ExecutionContext): Expression {
        const source = this.visit(e.source, ctx);
        return ctx.buildGetVectorElementExpression(source, e.index)
    }

    sliceVector(e: SliceVector, ctx: ExecutionContext): Expression {
        const source = this.visit(e.source, ctx);
        return ctx.buildSliceVectorExpression(source, e.start, e.end);
    }

    makeMatrix(e: MakeMatrix, ctx: ExecutionContext): Expression {
        const elements = e.elements.map(r => r.map(e => this.visit(e, ctx)));
        return ctx.buildMakeMatrixExpression(elements);
    }

    // LOAD AND STORE
    // --------------------------------------------------------------------------------------------
    loadExpression(e: LoadExpression, ctx: ExecutionContext): Expression {
        switch (e.source) {
            case 'const':  return ctx.buildLoadExpression('load.const', this.constOffset + e.index);
            case 'param':  return e;
            case 'local':  return e;
            case 'trace':  return e;
            case 'static': return e;
        }
    }

    // CALL EXPRESSION
    // --------------------------------------------------------------------------------------------
    callExpression(e: CallExpression, ctx: ExecutionContext): Expression {
        const params = e.params.map(p => this.visit(p, ctx))
        return ctx.buildCallExpression(this.funcOffset + e.index, params);
    }
}