"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const air_assembly_1 = require("@guildofweavers/air-assembly");
const utils_1 = require("./utils");
// PUBLIC FUNCTIONS
// ================================================================================================
function importConstants(from, to) {
    const constOffset = to.constants.length;
    for (let constant of from.constants) {
        to.addConstant(constant.value.value);
    }
    return constOffset;
}
exports.importConstants = importConstants;
function importFunctions(from, to, constOffset) {
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
    return funcOffset;
}
exports.importFunctions = importFunctions;
function importComponent(component, to, offsets, alias) {
    const importName = alias || component.name;
    const functions = [];
    const importer = new ExpressionImporter(offsets.constants, offsets.functions);
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
    let funcInfo = buildFunctionInfo(component, 'transition', importName, offsets);
    ctx = to.createFunctionContext(traceDimensions, funcInfo.handle);
    ctx.addParam(traceDimensions, utils_1.ProcedureParams.thisTraceRow);
    ctx.addParam(staticDimensions, utils_1.ProcedureParams.staticRow);
    component.transitionFunction.locals.forEach(local => ctx.addLocal(local.dimensions, local.handle));
    statements = component.transitionFunction.statements.map(s => {
        const expression = importer.visit(s.expression, ctx);
        return ctx.buildStoreOperation(s.handle || s.target, expression);
    });
    result = importer.visit(component.transitionFunction.result, ctx);
    to.addFunction(ctx, statements, result);
    functions.push(funcInfo);
    // import constraint evaluator
    funcInfo = buildFunctionInfo(component, 'evaluation', importName, offsets);
    ctx = to.createFunctionContext(constraintDimensions, funcInfo.handle);
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
    functions.push(funcInfo);
    return functions;
}
exports.importComponent = importComponent;
// EXPRESSION IMPORTER
// ================================================================================================
class ExpressionImporter extends air_assembly_1.ExpressionVisitor {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(constOffset, funcOffset) {
        super();
        this.constOffset = constOffset;
        this.funcOffset = funcOffset;
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
// HELPER FUNCTIONS
// ================================================================================================
function buildFunctionInfo(component, procedure, alias, offsets) {
    const dimensions = (procedure === 'evaluation')
        ? component.constraintEvaluator.result.dimensions
        : component.transitionFunction.result.dimensions;
    let maskCount = 0;
    for (let register of component.staticRegisters) {
        if (utils_1.isMaskRegister(register)) {
            maskCount++;
        }
    }
    return {
        type: 'func',
        handle: `$${alias}_${procedure}`,
        dimensions: dimensions,
        subset: false,
        auxOffset: offsets.auxRegisters,
        auxCount: offsets.auxRegisterCount,
        maskCount: maskCount,
        cycleLength: component.cycleLength,
        rank: maskCount - 1
    };
}
//# sourceMappingURL=importer.js.map