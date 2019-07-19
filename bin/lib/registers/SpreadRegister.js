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
        const trace = this.field.newVector(ctx.traceLength);
        let start = 0;
        for (let i = 0; i < values.length; i++, start += cycleLength) {
            trace.fill(values[i], start, start + cycleLength);
        }
        this.poly = this.field.interpolateRoots(ctx.executionDomain, trace);
        if (ctx.evaluationDomain) {
            this.allEvaluations = this.field.evalPolyAtRoots(this.poly, ctx.evaluationDomain);
        }
    }
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    getTraceValue(step) {
        const values = this.allEvaluations;
        const position = step * this.extensionFactor;
        return values[position % values.length];
    }
    getEvaluation(position) {
        const values = this.allEvaluations;
        return values[position % values.length];
    }
    getEvaluationAt(x) {
        return this.field.evalPolyAt(this.poly, x);
    }
    getAllEvaluations() {
        if (!this.allEvaluations)
            throw new Error('Register evaluations are undefined');
        return this.allEvaluations;
    }
}
exports.SpreadRegister = SpreadRegister;
//# sourceMappingURL=SpreadRegister.js.map