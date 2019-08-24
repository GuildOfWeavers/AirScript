// IMPORTS
// ================================================================================================
import { FiniteField, Vector } from "@guildofweavers/galois";
import { ReadonlyRegister, ReadonlyRegisterEvaluator } from "./index";
import { ProofContext, VerificationContext } from "../contexts";

// CLASS DEFINITION
// ================================================================================================
export class SpreadRegister implements ReadonlyRegister {

    readonly field              : FiniteField;
    readonly poly               : Vector;
    readonly evaluations        : Vector;
    readonly compositionFactor  : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(values: bigint[], ctx: ProofContext) {

        this.field = ctx.field;
        
        // create trace mask
        const traceValues = buildTraceMask(values, ctx.traceLength);

        // build the polynomial describing spread values
        const trace = this.field.newVectorFrom(traceValues);
        this.poly = this.field.interpolateRoots(ctx.executionDomain, trace);

        // evaluate the polynomial over composition domain
        this.compositionFactor = ctx.compositionDomain.length / ctx.traceLength;
        this.evaluations = this.field.evalPolyAtRoots(this.poly, ctx.compositionDomain);
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    getTraceValue(step: number): bigint {
        const values = this.evaluations!;
        const position = step * this.compositionFactor!;
        return values.getValue(position % values.length);
    }

    getEvaluation(position: number): bigint {
        const values = this.evaluations!;
        return values.getValue(position % values.length);
    }

    getAllEvaluations(evaluationDomain: Vector): Vector {
        return this.field.evalPolyAtRoots(this.poly, evaluationDomain);
    }

    // STATIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    static buildEvaluator(values: bigint[], ctx: VerificationContext): ReadonlyRegisterEvaluator {
        const field = ctx.field;

        // create trace mask
        const traceValues = buildTraceMask(values, ctx.traceLength);

        // build the polynomial describing spread values
        const trace = field.newVectorFrom(traceValues);
        const poly = field.interpolateRoots(ctx.executionDomain!, trace);

        // build and return the evaluator function
        return function(x) {
            return field.evalPolyAt(poly, x);
        }
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function buildTraceMask(values: bigint[], traceLength: number): bigint[] {
    const traceValues = new Array<bigint>(traceLength)
    const stretchLength = traceLength / values.length;

    let start = 0;
    for (let i = 0; i < values.length; i++, start += stretchLength) {
        traceValues.fill(values[i], start, start + stretchLength);
    }

    return traceValues;
}