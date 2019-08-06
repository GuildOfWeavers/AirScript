// IMPORTS
// ================================================================================================
import { FiniteField, Vector } from "@guildofweavers/galois";
import { ReadonlyRegister, EvaluationContext } from "@guildofweavers/air-script";

// CLASS DEFINITION
// ================================================================================================
export class RepeatRegister implements ReadonlyRegister {

    readonly field              : FiniteField;
    readonly cycleCount         : bigint;
    readonly poly               : Vector;
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
        const ys = this.field.newVectorFrom(values);

        if (ctx.evaluationDomain) {
            this.domainSize = ctx.evaluationDomain.length;
            
            const skip = this.domainSize / values.length;
            const xs = this.field.pluckVector(ctx.evaluationDomain, skip, ys.length);
            this.poly = this.field.interpolateRoots(xs, ys);

            const length2 = values.length * this.extensionFactor;
            const skip2 = this.domainSize / length2;
            const xs2 = this.field.pluckVector(ctx.evaluationDomain, skip2, length2);
            this.evaluations = this.field.evalPolyAtRoots(this.poly, xs2);
        }
        else {
            const g = this.field.exp(ctx.rootOfUnity, BigInt(this.extensionFactor) * this.cycleCount);
            const xs = this.field.getPowerSeries(g, ys.length);
            this.poly = this.field.interpolateRoots(xs, ys);
            this.domainSize = this.extensionFactor * ctx.traceLength;
        }
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    getTraceValue(step: number): bigint {
        const values = this.evaluations!;
        const position = step * this.extensionFactor;
        return values.getValue(position % values.length);
    }

    getEvaluation(position: number): bigint {
        const values = this.evaluations!;
        return values.getValue(position % values.length);
    }

    getEvaluationAt(x: bigint): bigint {
        const xp = this.field.exp(x, this.cycleCount);
        return this.field.evalPolyAt(this.poly, xp);
    }

    getAllEvaluations(): Vector {
        if (!this.evaluations) throw new Error('Register evaluations are undefined');
        
        // figure out how many times the evaluations vector needs to be doubled to reach domain size
        let i = 0, length = this.evaluations.length;
        while (length < this.domainSize) {
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
}