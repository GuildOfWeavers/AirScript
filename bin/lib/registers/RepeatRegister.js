"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class RepeatRegister {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(values, ctx) {
        this.field = ctx.field;
        // make sure the length of values is at least 4; this is needed for FFT interpolation
        if (values.length === 2) {
            values = values.concat(values);
        }
        // determine composition factor
        const domainSize = ctx.compositionDomain.length;
        this.compositionFactor = domainSize / ctx.traceLength;
        // build the polynomial describing cyclic values
        const skip = domainSize / values.length;
        const ys = this.field.newVectorFrom(values);
        const xs = this.field.pluckVector(ctx.compositionDomain, skip, ys.length);
        const poly = this.field.interpolateRoots(xs, ys);
        // evaluate the polynomial over a subset of composition domain
        const length2 = values.length * this.compositionFactor;
        const skip2 = domainSize / length2;
        const xs2 = this.field.pluckVector(ctx.compositionDomain, skip2, length2);
        this.evaluations = this.field.evalPolyAtRoots(poly, xs2);
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
        // figure out how many times the evaluations vector needs to be doubled to reach domain size
        let i = 0, length = this.evaluations.length;
        while (length < evaluationDomain.length) {
            length = length << 1;
            i++;
        }
        // duplicate the evaluation vector as needed
        if (i > 0) {
            return this.field.duplicateVector(this.evaluations, i);
        }
        else {
            return this.evaluations;
        }
    }
    // STATIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    static buildEvaluator(values, ctx) {
        const field = ctx.field;
        // make sure the length of values is at least 4; this is needed for FFT interpolation
        if (values.length === 2) {
            values = values.concat(values);
        }
        // determine number of cycles over the execution trace
        const cycleCount = BigInt(ctx.traceLength / values.length);
        // build the polynomial describing cyclic values
        const g = field.exp(ctx.rootOfUnity, BigInt(ctx.extensionFactor) * cycleCount);
        const ys = field.newVectorFrom(values);
        const xs = field.getPowerSeries(g, ys.length);
        const poly = field.interpolateRoots(xs, ys);
        // build and return the evaluator function
        return function (x) {
            const xp = field.exp(x, cycleCount);
            return field.evalPolyAt(poly, xp);
        };
    }
}
exports.RepeatRegister = RepeatRegister;
//# sourceMappingURL=RepeatRegister.js.map