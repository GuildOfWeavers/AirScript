"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const air_assembly_1 = require("@guildofweavers/air-assembly");
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
            case 'const': return ctx.buildLoadExpression('load.const', this.constOffset + e.index);
            case 'param': return e;
            case 'local': return e;
            case 'trace': return e;
            case 'static': return e;
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