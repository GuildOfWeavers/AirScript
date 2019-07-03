"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CyclicRegister_1 = require("./registers/CyclicRegister");
const InputRegister_1 = require("./registers/InputRegister");
// CLASS DEFINITION
// ================================================================================================
class AirObject {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(config, extensionFactor) {
        this.field = config.field;
        this.applyTransition = config.transitionFunction.bind(this.field);
        this.constraintEvaluator = config.constraintEvaluator.bind(this.field);
        this.totalSteps = config.totalSteps;
        this.stateWidth = config.stateWidth;
        this.secretInputCount = config.secretInputCount;
        this.publicInputCount = config.publicInputCount;
        this.constants = config.constants;
        this.constraints = config.constraints;
        this.extensionFactor = extensionFactor;
    }
    createContext(pInputs, sInputs) {
        const field = this.field;
        const totalSteps = this.totalSteps;
        const extensionFactor = this.extensionFactor;
        const evaluationDomainSize = totalSteps * extensionFactor;
        const rootOfUnity = field.getRootOfUnity(evaluationDomainSize);
        let ctx, sRegisters;
        if (sInputs) {
            const evaluationDomain = field.getPowerCycle(rootOfUnity);
            const executionDomain = new Array(totalSteps);
            for (let i = 0; i < executionDomain.length; i++) {
                executionDomain[i] = evaluationDomain[i * this.extensionFactor];
            }
            ctx = { field, totalSteps, extensionFactor, rootOfUnity, evaluationDomain, executionDomain };
            sRegisters = this.buildInputRegisters(sInputs, ctx);
        }
        else {
            ctx = { field, totalSteps, rootOfUnity, extensionFactor };
            sRegisters = [];
        }
        const kRegisters = this.buildConstantRegisters(ctx);
        const pRegisters = this.buildInputRegisters(pInputs, ctx);
        return { ...ctx, kRegisters, sRegisters, pRegisters,
            stateWidth: this.stateWidth,
            constraints: this.constraints
        };
    }
    // EXECUTION
    // --------------------------------------------------------------------------------------------
    generateExecutionTrace(initValues, ctx) {
        const trace = new Array(ctx.stateWidth);
        const rValues = new Array(ctx.stateWidth);
        const nValues = new Array(ctx.stateWidth);
        const sValues = new Array(ctx.sRegisters.length);
        const pValues = new Array(ctx.pRegisters.length);
        const kValues = new Array(ctx.kRegisters.length);
        for (let register = 0; register < trace.length; register++) {
            trace[register] = new Array(ctx.totalSteps);
            trace[register][0] = rValues[register] = initValues[register];
        }
        let step = 0;
        while (step < ctx.totalSteps - 1) {
            // get values of readonly registers for the current step
            for (let i = 0; i < kValues.length; i++) {
                kValues[i] = ctx.kRegisters[i].getTraceValue(step);
            }
            // get values of secret input registers for the current step
            for (let i = 0; i < sValues.length; i++) {
                sValues[i] = ctx.sRegisters[i].getTraceValue(step);
            }
            // get values of public input registers for the current step
            for (let i = 0; i < pValues.length; i++) {
                pValues[i] = ctx.pRegisters[i].getTraceValue(step);
            }
            // populate nValues with the next computation state
            this.applyTransition(rValues, kValues, sValues, pValues, nValues);
            // copy nValues to execution trace and update rValues for the next iteration
            step++;
            for (let register = 0; register < nValues.length; register++) {
                trace[register][step] = rValues[register] = nValues[register];
            }
        }
        return trace;
    }
    evaluateConstraints(trace, ctx) {
        const domainSize = ctx.evaluationDomain.length;
        const constraintCount = ctx.constraints.length;
        const extensionFactor = this.extensionFactor;
        const evaluations = new Array(constraintCount);
        for (let i = 0; i < constraintCount; i++) {
            evaluations[i] = new Array(domainSize);
        }
        const nfSteps = domainSize - extensionFactor;
        const rValues = new Array(ctx.stateWidth);
        const nValues = new Array(ctx.stateWidth);
        const sValues = new Array(ctx.sRegisters.length);
        const pValues = new Array(ctx.pRegisters.length);
        const kValues = new Array(ctx.kRegisters.length);
        const qValues = new Array(constraintCount);
        for (let position = 0; position < domainSize; position++) {
            // set values for mutable registers for current and next steps
            for (let register = 0; register < ctx.stateWidth; register++) {
                rValues[register] = trace[register][position];
                let nextStepIndex = (position + extensionFactor) % domainSize;
                nValues[register] = trace[register][nextStepIndex];
            }
            // get values of readonly registers for the current position
            for (let i = 0; i < kValues.length; i++) {
                kValues[i] = ctx.kRegisters[i].getEvaluation(position);
            }
            // get values of secret input registers for the current position
            for (let i = 0; i < sValues.length; i++) {
                sValues[i] = ctx.sRegisters[i].getEvaluation(position);
            }
            // get values of public input registers for the current position
            for (let i = 0; i < pValues.length; i++) {
                pValues[i] = ctx.pRegisters[i].getEvaluation(position);
            }
            // populate qValues with results of constraint evaluations
            this.constraintEvaluator(rValues, nValues, kValues, sValues, pValues, qValues);
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
        return evaluations;
    }
    // VERIFICATION
    // --------------------------------------------------------------------------------------------
    evaluateConstraintsAt(x, rValues, nValues, sValues, ctx) {
        const constraintCount = 0;
        const pValues = new Array(ctx.pRegisters.length);
        const kValues = new Array(ctx.kRegisters.length);
        // get values of readonly registers for the current position
        for (let i = 0; i < kValues.length; i++) {
            kValues[i] = ctx.kRegisters[i].getEvaluationAt(x);
        }
        // get values of public input registers for the current position
        for (let i = 0; i < pValues.length; i++) {
            pValues[i] = ctx.pRegisters[i].getEvaluationAt(x);
        }
        const qValues = new Array(constraintCount);
        this.constraintEvaluator(rValues, nValues, kValues, sValues, pValues, qValues);
        return qValues;
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    buildConstantRegisters(ctx) {
        const kRegisters = [];
        for (let constant of this.constants) {
            if (constant.pattern === 'repeat') {
                let register = new CyclicRegister_1.CyclicRegister(constant.values, ctx);
                kRegisters.push(register);
            }
            else {
                throw new TypeError(`Invalid constant pattern '${constant.pattern}'`);
            }
        }
        return kRegisters;
    }
    buildInputRegisters(inputs, ctx) {
        const pRegisters = [];
        if (!ctx.executionDomain) {
            const rootOfUnity = this.field.exp(ctx.rootOfUnity, BigInt(this.extensionFactor));
            const executionDomain = this.field.getPowerCycle(rootOfUnity);
            ctx = { ...ctx, executionDomain };
        }
        for (let i = 0; i < inputs.length; i++) {
            let register = new InputRegister_1.InputRegister(inputs[i], ctx);
            pRegisters.push(register);
        }
        return pRegisters;
    }
}
exports.AirObject = AirObject;
// HELPER FUNCTIONS
// ================================================================================================
//# sourceMappingURL=AirObject.js.map