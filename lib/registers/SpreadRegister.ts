// IMPORTS
// ================================================================================================
import { FiniteField, Polynom, Vector } from "@guildofweavers/galois";
import { ReadonlyRegister, EvaluationContext } from "@guildofweavers/air-script";

// CLASS DEFINITION
// ================================================================================================
export class SpreadRegister implements ReadonlyRegister {

    readonly field              : FiniteField;
    readonly poly               : Polynom;
    readonly extensionFactor    : number;
    readonly allEvaluations?    : Vector;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(values: bigint[], ctx: EvaluationContext) {

        this.field = ctx.field;
        this.extensionFactor = ctx.extensionFactor;

        const cycleLength = ctx.traceLength / values.length;
        let start = 0, traceValues = new Array<bigint>(ctx.traceLength);
        for (let i = 0; i < values.length; i++, start += cycleLength) {
            traceValues.fill(values[i], start, start + cycleLength);
        }

        const trace = this.field.newVectorFrom(traceValues);
        this.poly = this.field.interpolateRoots(ctx.executionDomain!, trace);

        if (ctx.evaluationDomain) {
            this.allEvaluations = this.field.evalPolyAtRoots(this.poly, ctx.evaluationDomain);
        }
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    getTraceValue(step: number): bigint {
        const values = this.allEvaluations!;
        const position = step * this.extensionFactor!;
        return values.getValue(position % values.length);
    }

    getEvaluation(position: number): bigint {
        const values = this.allEvaluations!;
        return values.getValue(position % values.length);
    }

    getEvaluationAt(x: bigint): bigint {
        return this.field.evalPolyAt(this.poly, x);
    }

    getAllEvaluations(): Vector {
        if (!this.allEvaluations) throw new Error('Register evaluations are undefined');
        return this.allEvaluations;
    }
}