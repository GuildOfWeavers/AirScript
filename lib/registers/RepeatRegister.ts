// IMPORTS
// ================================================================================================
import { FiniteField, Polynom, Vector } from "@guildofweavers/galois";
import { ReadonlyRegister, EvaluationContext } from "@guildofweavers/air-script";

// CLASS DEFINITION
// ================================================================================================
export class RepeatRegister implements ReadonlyRegister {

    readonly field              : FiniteField;
    readonly cycleCount         : bigint;
    readonly poly               : Polynom;
    readonly extensionFactor    : number;
    readonly domainSize         : number;
    readonly evaluations?       : Vector;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(values: bigint[], ctx: EvaluationContext) {

        this.field = ctx.field;
        this.extensionFactor = ctx.extensionFactor;

        // make sure the length of values is at least 4; this is needed for FFT interpolation
        if (values.length === 2) {
            values = values.concat(values);
        }
        this.cycleCount = BigInt(ctx.traceLength / values.length);

        if (ctx.evaluationDomain) {
            this.domainSize = ctx.evaluationDomain.length;
            
            const skip = this.domainSize / values.length;
            const xs = this.field.newVector(values.length);
            for (let i = 0; i < values.length; i++) {
                xs[i] = ctx.evaluationDomain[i * skip];
            }
            this.poly = this.field.interpolateRoots(xs, values);

            const skip2 = this.domainSize / (values.length * this.extensionFactor);
            const xs2 = this.field.newVector(values.length * this.extensionFactor);
            for (let i = 0; i < xs2.length; i++) {
                xs2[i] = ctx.evaluationDomain[i * skip2];
            }
            this.evaluations = this.field.evalPolyAtRoots(this.poly, xs2);
        }
        else {
            const g = this.field.exp(ctx.rootOfUnity, BigInt(this.extensionFactor) * this.cycleCount);
            const xs = this.field.getPowerCycle(g);
            this.poly = this.field.interpolateRoots(xs, values);
            this.domainSize = this.extensionFactor * ctx.traceLength;
        }
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    getTraceValue(step: number): bigint {
        const values = this.evaluations!;
        const position = step * this.extensionFactor;
        return values[position % values.length];
    }

    getEvaluation(position: number): bigint {
        const values = this.evaluations!;
        return values[position % values.length];
    }

    getEvaluationAt(x: bigint): bigint {
        const xp = this.field.exp(x, this.cycleCount);
        return this.field.evalPolyAt(this.poly, xp);
    }

    getAllEvaluations() {
        if (!this.evaluations) throw new Error('Register evaluations are undefined');
        let allEvaluations = this.evaluations;

        // double evaluation array until it reaches domain size
        while (allEvaluations.length < this.domainSize) {
            allEvaluations = allEvaluations.concat(allEvaluations);
        }
        return allEvaluations;
    }
}