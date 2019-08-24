"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const registers_1 = require("../registers");
// CLASS DEFINITION
// ================================================================================================
class VerificationContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(air, pInputs, extensionFactor) {
        this.air = air;
        this.traceLength = air.steps;
        this.extensionFactor = extensionFactor;
        // TODO: validate inputs
        const evaluationDomainSize = this.traceLength * extensionFactor;
        this.rootOfUnity = this.field.getRootOfUnity(evaluationDomainSize);
        // pre-build execution domain for spread registers
        if (this.air.hasSpreadRegisters) {
            const rootOfUnity2 = this.field.exp(this.rootOfUnity, BigInt(extensionFactor));
            this.executionDomain = this.field.getPowerSeries(rootOfUnity2, this.traceLength);
        }
        // build static and public register evaluators
        this.kRegisters = registers_1.buildReadonlyRegisterEvaluators(this.air.staticRegisters, this);
        this.pRegisters = registers_1.buildInputRegisterEvaluators(pInputs, this.air.publicInputs, false, this);
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
    // CONSTRAINT EVALUATION
    // --------------------------------------------------------------------------------------------
    evaluateConstraintsAt(x, rValues, nValues, sValues) {
        // get values of readonly registers for the current position
        const kValues = new Array(this.kRegisters.length);
        for (let i = 0; i < kValues.length; i++) {
            kValues[i] = this.kRegisters[i](x);
        }
        // get values of public inputs for the current position
        const pValues = new Array(this.pRegisters.length);
        for (let i = 0; i < pValues.length; i++) {
            pValues[i] = this.pRegisters[i](x);
        }
        // populate qValues with constraint evaluations
        const qValues = new Array(this.constraintCount);
        this.air.evaluateConstraints(rValues, nValues, kValues, sValues, pValues, qValues);
        return qValues;
    }
}
exports.VerificationContext = VerificationContext;
//# sourceMappingURL=VerificationContext.js.map