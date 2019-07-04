"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class SpreadRegister {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(values, ctx) {
        this.field = ctx.field;
        this.extensionFactor = ctx.extensionFactor;
        const cycleLength = ctx.traceLength / values.length;
        const trace = new Array(ctx.traceLength);
        let start = 0;
        for (let i = 0; i < values.length; i++, start += cycleLength) {
            trace.fill(values[i], start, start + cycleLength);
        }
        this.poly = this.field.interpolateRoots(ctx.executionDomain, trace);
        if (ctx.evaluationDomain) {
            this.evaluations = this.field.evalPolyAtRoots(this.poly, ctx.evaluationDomain);
        }
    }
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    getTraceValue(step) {
        const values = this.evaluations;
        const position = step * this.extensionFactor;
        return values[position % values.length];
    }
    getEvaluation(position) {
        const values = this.evaluations;
        return values[position % values.length];
    }
    getEvaluationAt(x) {
        return this.field.evalPolyAt(this.poly, x);
    }
}
exports.SpreadRegister = SpreadRegister;
//# sourceMappingURL=SpreadRegister.js.map