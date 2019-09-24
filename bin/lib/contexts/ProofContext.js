"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const registers_1 = require("../registers");
// CLASS DEFINITION
// ================================================================================================
class ProofContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(air, pInputs, sInputs, extensionFactor) {
        this.air = air;
        this.traceLength = air.steps;
        this.extensionFactor = extensionFactor;
        this.compositionFactor = getCompositionFactor(air.maxConstraintDegree);
        // build evaluation domain
        const evaluationDomainSize = this.traceLength * extensionFactor;
        this.rootOfUnity = this.field.getRootOfUnity(evaluationDomainSize);
        this.evaluationDomain = this.field.getPowerSeries(this.rootOfUnity, evaluationDomainSize);
        // build execution and composition domains by plucking values from evaluation domain
        const eSkip = extensionFactor;
        this.executionDomain = this.field.pluckVector(this.evaluationDomain, eSkip, this.traceLength);
        const cSkip = extensionFactor / this.compositionFactor;
        const compositionDomainLength = this.traceLength * this.compositionFactor;
        this.compositionDomain = this.field.pluckVector(this.evaluationDomain, cSkip, compositionDomainLength);
        // build readonly registers
        this.kRegisters = registers_1.buildReadonlyRegisters(this.air.staticRegisters, this);
        this.pRegisters = registers_1.buildInputRegisters(pInputs, this.air.publicInputs, false, this);
        this.sRegisters = registers_1.buildInputRegisters(sInputs, this.air.secretInputs, true, this);
    }
    // AIR PASS-THROUGH PROPERTIES
    // --------------------------------------------------------------------------------------------
    get field() {
        return this.air.field;
    }
    get stateWidth() {
        return this.air.stateWidth;
    }
    get constraintCount() {
        return this.air.constraints.length;
    }
    get secretInputCount() {
        return this.air.secretInputs.length;
    }
    get publicInputCount() {
        return this.air.publicInputs.length;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    getSecretRegisterTraces() {
        return this.sRegisters.map(register => register.getAllEvaluations(this.evaluationDomain));
    }
    generateExecutionTrace(initValues) {
        const steps = this.traceLength - 1;
        const sValues = new Array(this.sRegisters.length);
        const pValues = new Array(this.pRegisters.length);
        const kValues = new Array(this.kRegisters.length);
        // make sure all initial values are valid
        validateInitValues(initValues, this.stateWidth);
        // initialize rValues and set first state of execution trace to initValues
        let nValues;
        let rValues = new Array(this.stateWidth);
        const traceValues = new Array(this.stateWidth);
        for (let register = 0; register < traceValues.length; register++) {
            traceValues[register] = new Array(this.traceLength);
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
            nValues = this.air.applyTransition(rValues, kValues, sValues, pValues);
            // copy nValues to execution trace and update rValues for the next iteration
            step++;
            for (let register = 0; register < nValues.length; register++) {
                traceValues[register][step] = nValues[register];
                rValues = nValues;
            }
        }
        return this.field.newMatrixFrom(traceValues);
    }
    evaluateTracePolynomials(polynomials) {
        const domainSize = this.compositionDomain.length;
        const constraintCount = this.constraintCount;
        const extensionFactor = domainSize / this.traceLength;
        // make sure trace polynomials are valid
        validateTracePolynomials(polynomials, this.stateWidth, this.traceLength);
        // evaluate transition polynomials over composition domain
        const tEvaluations = this.field.evalPolysAtRoots(polynomials, this.compositionDomain);
        // initialize evaluation arrays
        const evaluations = new Array(constraintCount);
        for (let i = 0; i < constraintCount; i++) {
            evaluations[i] = new Array(domainSize);
        }
        const nfSteps = domainSize - extensionFactor;
        const rValues = new Array(this.stateWidth);
        const nValues = new Array(this.stateWidth);
        const sValues = new Array(this.sRegisters.length);
        const pValues = new Array(this.pRegisters.length);
        const kValues = new Array(this.kRegisters.length);
        // evaluate constraints for each position of the extended trace
        let qValues;
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
            qValues = this.air.evaluateConstraints(rValues, nValues, kValues, sValues, pValues);
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
exports.ProofContext = ProofContext;
// HELPER FUNCTIONS
// ================================================================================================
function getCompositionFactor(maxConstraintDegree) {
    return 2 ** Math.ceil(Math.log2(maxConstraintDegree));
}
function validateInitValues(values, stateWidth) {
    if (!values)
        throw new TypeError('Initial values are undefined');
    if (!Array.isArray(values))
        throw new TypeError('Initial values parameter must be an array');
    if (values.length !== stateWidth) {
        throw new Error(`Initial values array must contain exactly ${stateWidth} elements`);
    }
    for (let i = 0; i < stateWidth; i++) {
        if (typeof values[i] !== 'bigint') {
            throw new TypeError(`Initial value ${i} is invalid: value '${values[i]}' is not a BigInt`);
        }
    }
}
function validateTracePolynomials(trace, stateWidth, traceLength) {
    if (!trace)
        throw new TypeError('Trace polynomials is undefined');
    if (!trace.rowCount || !trace.colCount) { // TODO: improve type checking
        throw new TypeError('Trace polynomials must be provided as a matrix of coefficients');
    }
    if (trace.rowCount !== stateWidth) {
        throw new Error(`Trace polynomials matrix must contain exactly ${stateWidth} rows`);
    }
    if (trace.colCount !== traceLength) {
        throw new Error(`Trace polynomials matrix must contain exactly ${traceLength} columns`);
    }
}
//# sourceMappingURL=ProofContext.js.map