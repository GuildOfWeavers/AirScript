"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class SpreadRegister {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(values, ctx) {
        this.field = ctx.field;
        // create trace mask
        const traceValues = buildTraceMask(values, ctx.traceLength);
        // build the polynomial describing spread values
        const trace = this.field.newVectorFrom(traceValues);
        this.poly = this.field.interpolateRoots(ctx.executionDomain, trace);
        // evaluate the polynomial over composition domain
        this.compositionFactor = ctx.compositionDomain.length / ctx.traceLength;
        this.evaluations = this.field.evalPolyAtRoots(this.poly, ctx.compositionDomain);
    }
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    getTraceValue(step) {
        const values = this.evaluations;
        const position = step * this.compositionFactor;
        return values.getValue(position % values.length);
    }
    getEvaluation(position) {
        const values = this.evaluations;
        return values.getValue(position % values.length);
    }
    getAllEvaluations(evaluationDomain) {
        return this.field.evalPolyAtRoots(this.poly, evaluationDomain);
    }
    // STATIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    static buildEvaluator(values, ctx) {
        const field = ctx.field;
        // create trace mask
        const traceValues = buildTraceMask(values, ctx.traceLength);
        // build the polynomial describing spread values
        const trace = field.newVectorFrom(traceValues);
        const poly = field.interpolateRoots(ctx.executionDomain, trace);
        // build and return the evaluator function
        return function (x) {
            return field.evalPolyAt(poly, x);
        };
    }
}
exports.SpreadRegister = SpreadRegister;
// HELPER FUNCTIONS
// ================================================================================================
function buildTraceMask(values, traceLength) {
    const traceValues = new Array(traceLength);
    const stretchLength = traceLength / values.length;
    let start = 0;
    for (let i = 0; i < values.length; i++, start += stretchLength) {
        traceValues.fill(values[i], start, start + stretchLength);
    }
    return traceValues;
}
//# sourceMappingURL=SpreadRegister.js.map