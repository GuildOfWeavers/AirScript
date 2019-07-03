"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class CyclicRegister {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(values, ctx) {
        this.field = ctx.field;
        this.extensionFactor = ctx.extensionFactor;
        this.cycleCount = BigInt(ctx.totalSteps / values.length);
        if (ctx.evaluationDomain) {
            const domainSize = ctx.evaluationDomain.length;
            const skip = domainSize / values.length;
            const xs = new Array(values.length);
            for (let i = 0; i < values.length; i++) {
                xs[i] = ctx.evaluationDomain[i * skip];
            }
            this.poly = this.field.interpolateRoots(xs, values);
            const skip2 = domainSize / (values.length * this.extensionFactor);
            const xs2 = new Array(values.length * this.extensionFactor);
            for (let i = 0; i < xs2.length; i++) {
                xs2[i] = ctx.evaluationDomain[i * skip2];
            }
            this.evaluations = this.field.evalPolyAtRoots(this.poly, xs2);
        }
        else {
            const g = this.field.exp(ctx.rootOfUnity, BigInt(this.extensionFactor) * this.cycleCount);
            const xs = this.field.getPowerCycle(g);
            this.poly = this.field.interpolateRoots(xs, values);
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
        const xp = this.field.exp(x, this.cycleCount);
        return this.field.evalPolyAt(this.poly, xp);
    }
}
exports.CyclicRegister = CyclicRegister;
//# sourceMappingURL=CyclicRegister.js.map