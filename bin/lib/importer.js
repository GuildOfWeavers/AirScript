"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const air_assembly_1 = require("@guildofweavers/air-assembly");
const utils_1 = require("./utils");
// PUBLIC FUNCTIONS
// ================================================================================================
function importConstants(from, to) {
    for (let constant of from.constants) {
        to.addConstant(constant.value.value);
    }
}
exports.importConstants = importConstants;
function importFunctions(from, to, offsets) {
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
exports.importFunctions = importFunctions;
function importComponent(from, to, member, offsets) {
    const component = from.components.get(member.member);
    if (!component)
        throw new Error('TODO: import component not found');
    const alias = member.alias || member.member;
    const functions = [];
    const importer = new ExpressionImporter(offsets);
    const traceDimensions = component.transitionFunction.result.dimensions;
    const staticDimensions = [component.staticRegisters.length, 0];
    const constraintDimensions = component.constraintEvaluator.result.dimensions;
    // import trace initializer
    let ctx = to.createFunctionContext(traceDimensions, `$${alias}_init`);
    component.traceInitializer.params.forEach(param => ctx.addParam(param.dimensions, param.handle));
    ctx.addParam(staticDimensions, utils_1.ProcedureParams.staticRow);
    component.traceInitializer.locals.forEach(local => ctx.addLocal(local.dimensions, local.handle));
    let statements = component.traceInitializer.statements.map(s => {
        const expression = importer.visit(s.expression, ctx);
        return ctx.buildStoreOperation(s.handle || s.target, expression);
    });
    let result = importer.visit(component.traceInitializer.result, ctx);
    to.addFunction(ctx, statements, result);
    // TODO: add to functions?
    // import transition function
    let handle = `$${alias}${utils_1.TRANSITION_FN_POSTFIX}`;
    ctx = to.createFunctionContext(traceDimensions, handle);
    ctx.addParam(traceDimensions, utils_1.ProcedureParams.thisTraceRow);
    ctx.addParam(staticDimensions, utils_1.ProcedureParams.staticRow);
    component.transitionFunction.locals.forEach(local => ctx.addLocal(local.dimensions, local.handle));
    statements = component.transitionFunction.statements.map(s => {
        const expression = importer.visit(s.expression, ctx);
        return ctx.buildStoreOperation(s.handle || s.target, expression);
    });
    result = importer.visit(component.transitionFunction.result, ctx);
    to.addFunction(ctx, statements, result);
    functions.push({ type: 'func', handle, dimensions: traceDimensions, subset: false });
    // import constraint evaluator
    handle = `$${alias}${utils_1.EVALUATION_FN_POSTFIX}`;
    ctx = to.createFunctionContext(constraintDimensions, handle);
    ctx.addParam(traceDimensions, utils_1.ProcedureParams.thisTraceRow);
    ctx.addParam(traceDimensions, utils_1.ProcedureParams.nextTraceRow);
    ctx.addParam(staticDimensions, utils_1.ProcedureParams.staticRow);
    component.constraintEvaluator.locals.forEach(local => ctx.addLocal(local.dimensions, local.handle));
    statements = component.constraintEvaluator.statements.map(s => {
        const expression = importer.visit(s.expression, ctx);
        return ctx.buildStoreOperation(s.handle || s.target, expression);
    });
    result = importer.visit(component.constraintEvaluator.result, ctx);
    to.addFunction(ctx, statements, result);
    functions.push({ type: 'func', handle, dimensions: constraintDimensions, subset: false });
    return functions;
}
exports.importComponent = importComponent;
// EXPRESSION IMPORTER
// ================================================================================================
class ExpressionImporter extends air_assembly_1.ExpressionVisitor {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(offsets) {
        super();
        this.constOffset = offsets.constants;
        this.funcOffset = offsets.functions;
    }
    // LITERALS
    // --------------------------------------------------------------------------------------------
    literalValue(e) {
        return e;
    }
    // OPERATIONS
    // --------------------------------------------------------------------------------------------
    binaryOperation(e, ctx) {
        const lhs = this.visit(e.lhs, ctx);
        const rhs = this.visit(e.rhs, ctx);
        return ctx.buildBinaryOperation(e.operation, lhs, rhs);
    }
    unaryOperation(e, ctx) {
        const operand = this.visit(e.operand, ctx);
        return ctx.buildUnaryOperation(e.operation, operand);
    }
    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    makeVector(e, ctx) {
        const elements = e.elements.map(e => this.visit(e, ctx));
        return ctx.buildMakeVectorExpression(elements);
    }
    getVectorElement(e, ctx) {
        const source = this.visit(e.source, ctx);
        return ctx.buildGetVectorElementExpression(source, e.index);
    }
    sliceVector(e, ctx) {
        const source = this.visit(e.source, ctx);
        return ctx.buildSliceVectorExpression(source, e.start, e.end);
    }
    makeMatrix(e, ctx) {
        const elements = e.elements.map(r => r.map(e => this.visit(e, ctx)));
        return ctx.buildMakeMatrixExpression(elements);
    }
    // LOAD AND STORE
    // --------------------------------------------------------------------------------------------
    loadExpression(e, ctx) {
        switch (e.source) {
            case 'const': {
                return ctx.buildLoadExpression('load.const', this.constOffset + e.index);
            }
            case 'static': {
                return ctx.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
            }
            case 'trace': {
                if (e.index === 0) {
                    return ctx.buildLoadExpression('load.param', utils_1.ProcedureParams.thisTraceRow);
                }
                else {
                    return ctx.buildLoadExpression('load.param', utils_1.ProcedureParams.nextTraceRow);
                }
            }
            case 'param': return e;
            case 'local': return e;
        }
    }
    // CALL EXPRESSION
    // --------------------------------------------------------------------------------------------
    callExpression(e, ctx) {
        const params = e.params.map(p => this.visit(p, ctx));
        return ctx.buildCallExpression(this.funcOffset + e.index, params);
    }
}
//# sourceMappingURL=importer.js.map