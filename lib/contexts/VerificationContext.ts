// IMPORTS
// ================================================================================================
import { FiniteField, Vector } from "@guildofweavers/galois";
import { VerificationContext as IVerificationContext } from "@guildofweavers/air-script"
import { AirObject } from "../AirObject";
import { ReadonlyRegisterEvaluator, buildReadonlyRegisterEvaluators, buildInputRegisterEvaluators } from "../registers";

// CLASS DEFINITION
// ================================================================================================
export class VerificationContext implements IVerificationContext {

    private readonly air        : AirObject;
    private readonly kRegisters : ReadonlyRegisterEvaluator[];
    private readonly pRegisters : ReadonlyRegisterEvaluator[];

    readonly traceLength        : number;
    readonly extensionFactor    : number;
    readonly rootOfUnity        : bigint;
    readonly executionDomain?   : Vector;
    
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(air: AirObject, pInputs: bigint[][], extensionFactor: number) {
        this.air = air;
        this.traceLength = air.steps;
        this.extensionFactor = extensionFactor;

        const evaluationDomainSize = this.traceLength * extensionFactor;
        this.rootOfUnity = this.field.getRootOfUnity(evaluationDomainSize);

        // pre-build execution domain for spread registers
        if (this.air.hasSpreadRegisters) {
            const rootOfUnity2 = this.field.exp(this.rootOfUnity, BigInt(extensionFactor));
            this.executionDomain = this.field.getPowerSeries(rootOfUnity2, this.traceLength);
        }

        // build static and public register evaluators
        this.kRegisters = buildReadonlyRegisterEvaluators(this.air.staticRegisters, this);
        this.pRegisters = buildInputRegisterEvaluators(pInputs, this.air.publicInputs, false, this);
    }

    // AIR PASS-THROUGH PROPERTIES
    // --------------------------------------------------------------------------------------------
    get field(): FiniteField {
        return this.air.field;
    }

    get stateWidth(): number {
        return this.air.stateWidth;
    }

    get constraintCount(): number {
        return this.air.constraints.length;
    }

    get secretInputCount(): number {
        return this.air.secretInputs.length;
    }

    get publicInputCount(): number {
        return this.air.publicInputs.length;
    }

    // CONSTRAINT EVALUATION
    // --------------------------------------------------------------------------------------------
    evaluateConstraintsAt(x: bigint, rValues: bigint[], nValues: bigint[], sValues: bigint[]): bigint[] {
        // get values of readonly registers for the current position
        const kValues = new Array<bigint>(this.kRegisters.length);
        for (let i = 0; i < kValues.length; i++) {
            kValues[i] = this.kRegisters[i](x);
        }

        // get values of public inputs for the current position
        const pValues = new Array<bigint>(this.pRegisters.length);
        for (let i = 0; i < pValues.length; i++) {
            pValues[i] = this.pRegisters[i](x);
        }

        // populate qValues with constraint evaluations
        const qValues = this.air.evaluateConstraints(rValues, nValues, kValues, sValues, pValues);
        return qValues;
    }
}