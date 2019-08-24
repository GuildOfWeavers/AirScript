// IMPORTS
// ================================================================================================
import { FiniteField, Vector, Matrix } from "@guildofweavers/galois";
import { ProofContext as IProofContext } from "@guildofweavers/air-script"
import { AirObject } from "../AirObject";
import { ReadonlyRegister, buildReadonlyRegisters, buildInputRegisters } from "../registers";

// CLASS DEFINITION
// ================================================================================================
export class ProofContext implements IProofContext {

    private readonly air        : AirObject;
    private readonly kRegisters : ReadonlyRegister[];
    private readonly pRegisters : ReadonlyRegister[];
    private readonly sRegisters : ReadonlyRegister[];

    readonly traceLength        : number;
    readonly extensionFactor    : number;
    readonly compositionFactor  : number;
    readonly rootOfUnity        : bigint;

    readonly executionDomain    : Vector;
    readonly evaluationDomain   : Vector;
    readonly compositionDomain  : Vector;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(air: AirObject, pInputs: bigint[][], sInputs: bigint[][], extensionFactor: number) {
        this.air = air;
        this.traceLength = air.steps;
        this.extensionFactor = extensionFactor;
        this.compositionFactor = getCompositionFactor(air.maxConstraintDegree);

        // TODO: validate inputs

        // build evaluation domain
        const evaluationDomainSize = this.traceLength * extensionFactor;
        this.rootOfUnity = this.field.getRootOfUnity(evaluationDomainSize);
        this.evaluationDomain = this.field.getPowerSeries(this.rootOfUnity, evaluationDomainSize);

        // build execution and composition domains by plucking values from evaluation domain
        this.executionDomain = this.field.pluckVector(this.evaluationDomain, extensionFactor, this.traceLength);
        const compositionDomainLength = this.traceLength * this.compositionFactor;
        this.compositionDomain = this.field.pluckVector(this.evaluationDomain, this.compositionFactor, compositionDomainLength);

        // build readonly registers
        this.kRegisters = buildReadonlyRegisters(this.air.staticRegisters, this);
        this.pRegisters = buildInputRegisters(pInputs, this.air.publicInputs, false, this);
        this.sRegisters = buildInputRegisters(sInputs, this.air.secretInputs, true, this);
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

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    getSecretRegisterTraces(): Vector[] {
        return this.sRegisters.map(register => register.getAllEvaluations(this.evaluationDomain));
    }

    generateExecutionTrace(initValues: bigint[]): Matrix {

        const steps = this.traceLength - 1;
        const rValues = new Array<bigint>(this.stateWidth);
        const nValues = new Array<bigint>(this.stateWidth);
        const sValues = new Array<bigint>(this.sRegisters.length);
        const pValues = new Array<bigint>(this.pRegisters.length);
        const kValues = new Array<bigint>(this.kRegisters.length);

        // make sure all initial values are valid
        // TODO: validateInitValues(initValues, this.stateWidth);

        // initialize rValues and set first state of execution trace to initValues
        const traceValues = new Array<bigint[]>(this.stateWidth);
        for (let register = 0; register < traceValues.length; register++) {
            traceValues[register] = new Array<bigint>(this.traceLength);
            traceValues[register][0] = rValues[register] = initValues[register];
        }

        // apply transition function for each step
        let step = 0;
        while (step < steps) {
            // get values of readonly registers for the current step
            for (let i = 0; i < kValues.length; i++) {
                kValues[i] = this.kRegisters[i].getTraceValue(step);
            }

            // get values of secret input registers for the current step
            for (let i = 0; i < sValues.length; i++) {
                sValues[i] = this.sRegisters[i].getTraceValue(step);
            }

            // get values of public input registers for the current step
            for (let i = 0; i < pValues.length; i++) {
                pValues[i] = this.pRegisters[i].getTraceValue(step);
            }

            // populate nValues with the next computation state
            this.air.applyTransition(rValues, kValues, sValues, pValues, nValues);

            // copy nValues to execution trace and update rValues for the next iteration
            step++;
            for (let register = 0; register < nValues.length; register++) {
                traceValues[register][step] = rValues[register] = nValues[register];
            }
        }

        return this.field.newMatrixFrom(traceValues);
    }

    evaluateTracePolynomials(polynomials: Matrix): Matrix {

        // make sure evaluation trace is valid
        // TODO

        // 1 --- extend execution trace over composition domain
        
        const tEvaluations = this.field.evalPolysAtRoots(polynomials, this.compositionDomain);

        const domainSize = this.compositionDomain.length;
        const constraintCount = this.constraintCount;
        const extensionFactor = domainSize / this.traceLength;

        // initialize evaluation arrays
        const evaluations = new Array<bigint[]>(constraintCount);
        for (let i = 0; i < constraintCount; i++) {
            evaluations[i] = new Array<bigint>(domainSize);
        }

        const nfSteps = domainSize - extensionFactor;
        const rValues = new Array<bigint>(this.stateWidth);
        const nValues = new Array<bigint>(this.stateWidth);
        const sValues = new Array<bigint>(this.sRegisters.length);
        const pValues = new Array<bigint>(this.pRegisters.length);
        const kValues = new Array<bigint>(this.kRegisters.length);
        const qValues = new Array<bigint>(constraintCount);

        // evaluate constraints for each position of the extended trace
        for (let position = 0; position < domainSize; position++) {

            // set values for mutable registers for current and next steps
            for (let register = 0; register < this.stateWidth; register++) {
                rValues[register] = tEvaluations.getValue(register, position);

                let nextStepIndex = (position + extensionFactor) % domainSize;
                nValues[register] = tEvaluations.getValue(register, nextStepIndex);
            }

            // get values of readonly registers for the current position
            for (let i = 0; i < kValues.length; i++) {
                kValues[i] = this.kRegisters[i].getEvaluation(position);
            }

            // get values of secret input registers for the current position
            for (let i = 0; i < sValues.length; i++) {
                sValues[i] = this.sRegisters[i].getEvaluation(position);
            }

            // get values of public input registers for the current position
            for (let i = 0; i < pValues.length; i++) {
                pValues[i] = this.pRegisters[i].getEvaluation(position);
            }

            // populate qValues with results of constraint evaluations
            this.air.evaluateConstraints(rValues, nValues, kValues, sValues, pValues, qValues);

            // copy evaluations to the result, and also check that constraints evaluate to 0
            // at multiples of the extensions factor
            if (position % extensionFactor === 0 && position < nfSteps) {
                for (let constraint = 0; constraint < constraintCount; constraint++) {
                    let qValue = qValues[constraint];
                    if (qValue !== 0n) {
                        throw new Error(`Constraint ${constraint} didn't evaluate to 0 at step: ${position / extensionFactor}`);
                    }
                    evaluations[constraint][position] = qValue;
                }
            }
            else {
                for (let constraint = 0; constraint < constraintCount; constraint++) {
                    let qValue = qValues[constraint];
                    evaluations[constraint][position] = qValue;
                }
            }
        }

        return this.field.newMatrixFrom(evaluations);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function getCompositionFactor(maxConstraintDegree: number): number {
    return 2**Math.ceil(Math.log2(maxConstraintDegree));
}