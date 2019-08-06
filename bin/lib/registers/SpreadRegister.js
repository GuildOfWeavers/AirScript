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
        let start = 0, traceValues = new Array(ctx.traceLength);
        for (let i = 0; i < values.length; i++, start += cycleLength) {
            traceValues.fill(values[i], start, start + cycleLength);
        }
        const trace = this.field.newVectorFrom(traceValues);
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
        return values.getValue(position % values.length);
    }
    getEvaluation(position) {
        const values = this.allEvaluations;
        return values.getValue(position % values.length);
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