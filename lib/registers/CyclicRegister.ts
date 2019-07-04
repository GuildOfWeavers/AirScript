// IMPORTS
// ================================================================================================
import { FiniteField, Polynom } from "@guildofweavers/galois";
import { ComputedRegister, EvaluationContext } from "@guildofweavers/air-script";

// CLASS DEFINITION
// ================================================================================================
export class CyclicRegister implements ComputedRegister {

    readonly field              : FiniteField;
    readonly cycleCount         : bigint;
    readonly poly               : Polynom;
    readonly extensionFactor    : number;
    readonly evaluations?       : bigint[];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(values: bigint[], ctx: EvaluationContext) {

        this.field = ctx.field;
        this.extensionFactor = ctx.extensionFactor;
        this.cycleCount = BigInt(ctx.traceLength / values.length);

        if (ctx.evaluationDomain) {
            const domainSize = ctx.evaluationDomain.length;
            
            const skip = domainSize / values.length;
            const xs = new Array<bigint>(values.length);
            for (let i = 0; i < values.length; i++) {
                xs[i] = ctx.evaluationDomain[i * skip];
            }
            this.poly = this.field.interpolateRoots(xs, values);

            const skip2 = domainSize / (values.length * this.extensionFactor);
            const xs2 = new Array<bigint>(values.length * this.extensionFactor);
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
}