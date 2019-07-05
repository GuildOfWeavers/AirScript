// IMPORTS
// ================================================================================================
import { FiniteField, Polynom } from "@guildofweavers/galois";
import { ReadonlyRegister, EvaluationContext } from "@guildofweavers/air-script";

// CLASS DEFINITION
// ================================================================================================
export class SpreadRegister implements ReadonlyRegister {

    readonly field              : FiniteField;
    readonly poly               : Polynom;
    readonly extensionFactor    : number;
    readonly evaluations?       : bigint[];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(values: bigint[], ctx: EvaluationContext) {

        this.field = ctx.field;
        this.extensionFactor = ctx.extensionFactor;

        const cycleLength = ctx.traceLength / values.length;
        const trace = new Array<bigint>(ctx.traceLength);

        let start = 0;
        for (let i = 0; i < values.length; i++, start += cycleLength) {
            trace.fill(values[i], start, start + cycleLength);
        }

        this.poly = this.field.interpolateRoots(ctx.executionDomain!, trace);

        if (ctx.evaluationDomain) {
            this.evaluations = this.field.evalPolyAtRoots(this.poly, ctx.evaluationDomain);
        }
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    getTraceValue(step: number): bigint {
        const values = this.evaluations!;
        const position = step * this.extensionFactor!;
        return values[position % values.length];
    }

    getEvaluation(position: number): bigint {
        const values = this.evaluations!;
        return values[position % values.length];
    }

    getEvaluationAt(x: bigint): bigint {
        return this.field.evalPolyAt(this.poly, x);
    }
}