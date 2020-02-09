// IMPORTS
// ================================================================================================
import { AirSchema, ExpressionVisitor, ExecutionContext, Expression, LiteralValue, BinaryOperation,
    UnaryOperation, MakeVector, GetVectorElement, SliceVector, MakeMatrix, LoadExpression, CallExpression, Dimensions
} from "@guildofweavers/air-assembly";
import { ImportMember, SymbolInfo, FunctionInfo } from "./Module";
import { ProcedureParams, TRANSITION_FN_POSTFIX, EVALUATION_FN_POSTFIX } from "./utils";

// INTERFACES
// ================================================================================================
export interface ImportOffsets {
    readonly constants          : number;
    readonly functions          : number;
    readonly auxRegisters       : number;
    readonly auxRegisterCount   : number;
}

// PUBLIC FUNCTIONS
// ================================================================================================
export function importConstants(from: AirSchema, to: AirSchema): number {
    const constOffset = to.constants.length;
    for (let constant of from.constants) {
        to.addConstant(constant.value.value);
    }
    return constOffset;
}

export function importFunctions(from: AirSchema, to: AirSchema, constOffset: number): number {
    const funcOffset = to.functions.length;
    const importer = new ExpressionImporter(constOffset, funcOffset);
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
    return funcOffset
}

export function importComponent(from: AirSchema, to: AirSchema, member: ImportMember, offsets: ImportOffsets): SymbolInfo[] {
    const component = from.components.get(member.member);
    if (!component) throw new Error('TODO: import component not found');
    const alias = member.alias || member.member;
    
    const functions: SymbolInfo[] = [];
    const importer = new ExpressionImporter(offsets.constants, offsets.functions);

    const traceDimensions = component.transitionFunction.result.dimensions;
    const staticDimensions: Dimensions = [component.staticRegisters.length, 0];
    const constraintDimensions = component.constraintEvaluator.result.dimensions;

    // import trace initializer
    let ctx = to.createFunctionContext(traceDimensions, `$${alias}_init`);
    component.traceInitializer.params.forEach(param => ctx.addParam(param.dimensions, param.handle));
    ctx.addParam(staticDimensions, ProcedureParams.staticRow);
    component.traceInitializer.locals.forEach(local => ctx.addLocal(local.dimensions, local.handle));
    let statements = component.traceInitializer.statements.map(s => {
        const expression = importer.visit(s.expression, ctx);
        return ctx.buildStoreOperation(s.handle || s.target, expression);
    });
    let result = importer.visit(component.traceInitializer.result, ctx);
    to.addFunction(ctx, statements, result);
    // TODO: add to functions?

    // import transition function
    let handle = `$${alias}${TRANSITION_FN_POSTFIX}`;
    ctx = to.createFunctionContext(traceDimensions, handle);
    ctx.addParam(traceDimensions, ProcedureParams.thisTraceRow);
    ctx.addParam(staticDimensions, ProcedureParams.staticRow);
    component.transitionFunction.locals.forEach(local => ctx.addLocal(local.dimensions, local.handle));
    statements = component.transitionFunction.statements.map(s => {
        const expression = importer.visit(s.expression, ctx);
        return ctx.buildStoreOperation(s.handle || s.target, expression);
    });
    result = importer.visit(component.transitionFunction.result, ctx);
    to.addFunction(ctx, statements, result);
    functions.push(buildFunctionInfo(handle, traceDimensions, offsets));

    // import constraint evaluator
    handle = `$${alias}${EVALUATION_FN_POSTFIX}`;
    ctx = to.createFunctionContext(constraintDimensions, handle);
    ctx.addParam(traceDimensions, ProcedureParams.thisTraceRow);
    ctx.addParam(traceDimensions, ProcedureParams.nextTraceRow);
    ctx.addParam(staticDimensions, ProcedureParams.staticRow);
    component.constraintEvaluator.locals.forEach(local => ctx.addLocal(local.dimensions, local.handle));
    statements = component.constraintEvaluator.statements.map(s => {
        const expression = importer.visit(s.expression, ctx);
        return ctx.buildStoreOperation(s.handle || s.target, expression);
    });
    result = importer.visit(component.constraintEvaluator.result, ctx);
    to.addFunction(ctx, statements, result);
    functions.push(buildFunctionInfo(handle, traceDimensions, offsets));

    return functions;
}

// EXPRESSION IMPORTER
// ================================================================================================
class ExpressionImporter extends ExpressionVisitor<Expression> {

    readonly constOffset: number;
    readonly funcOffset : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(constOffset: number, funcOffset: number) {
        super();
        this.constOffset = constOffset;
        this.funcOffset = funcOffset;
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
            case 'const':  {
                return ctx.buildLoadExpression('load.const', this.constOffset + e.index);
            }
            case 'static': {
                return ctx.buildLoadExpression('load.param', ProcedureParams.staticRow);
            }
            case 'trace': {
                if (e.index === 0) {
                    return ctx.buildLoadExpression('load.param', ProcedureParams.thisTraceRow);
                }
                else {
                    return ctx.buildLoadExpression('load.param', ProcedureParams.nextTraceRow);
                }
            }
            case 'param':  return e;
            case 'local':  return e;
        }
    }

    // CALL EXPRESSION
    // --------------------------------------------------------------------------------------------
    callExpression(e: CallExpression, ctx: ExecutionContext): Expression {
        const params = e.params.map(p => this.visit(p, ctx))
        return ctx.buildCallExpression(this.funcOffset + e.index, params);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function buildFunctionInfo(handle: string, dimensions: Dimensions, offsets: ImportOffsets): FunctionInfo {
    return {
        type        : 'func',
        handle      : handle,
        dimensions  : dimensions,
        subset      : false,
        auxOffset   : offsets.auxRegisters,
        auxLength   : offsets.auxRegisterCount,
        rank        : 1   // TODO
    };
}