// IMPORTS
// ================================================================================================
import { FiniteField, Vector } from "@guildofweavers/galois";
import {
    AirObject as IAirObject, EvaluationContext, ProofContext, VerificationContext, ReadonlyRegister, ConstraintSpecs
} from "@guildofweavers/air-script";
import { RepeatRegister } from "./registers/RepeatRegister";
import { SpreadRegister } from "./registers/SpreadRegister";

// INTERFACES
// ================================================================================================
export interface AirConfig {
    name                : string;
    field               : FiniteField;
    steps               : number;
    stateWidth          : number;
    secretInputs        : InputRegisterSpecs[];
    publicInputs        : InputRegisterSpecs[];
    staticRegisters     : ReadonlyRegisterSpecs[];
    constraints         : ConstraintSpecs[];
    transitionFunction  : TransitionFunction;
    constraintEvaluator : ConstraintEvaluator;
}

export type ReadonlyValuePattern = 'repeat' | 'spread';

export interface InputRegisterSpecs {    
    pattern : ReadonlyValuePattern;
    binary  : boolean;
}

export interface ReadonlyRegisterSpecs {
    pattern : ReadonlyValuePattern;
    binary  : boolean;
    values  : bigint[];
}

export interface TransitionFunction {
    /**
     * @param r Array with values of mutable registers at the current step
     * @param k Array with values of static registers at the current step
     * @param s Array with values of secret inputs at the current step
     * @param p Array with values of public inputs at the current step
     * @param out Array to hold values of mutable registers for the next step
     */
    (r: bigint[], k: bigint[], s: bigint[], p: bigint[], out: bigint[]): void;
}

export interface ConstraintEvaluator {
    /**
     * @param r Array with values of mutable registers at the current step
     * @param n Array with values of mutable registers at the next step
     * @param k Array with values of static registers at the current step
     * @param s Array with values of secret inputs at the current step
     * @param p Array with values of public inputs at the current step
     * @param out Array to hold values of constraint evaluated at the current step
     */
    (r: bigint[], n: bigint[], k: bigint[], s: bigint[], p: bigint[], out: bigint[]): void;
}

// CLASS DEFINITION
// ================================================================================================
export class AirObject implements IAirObject {

    readonly name               : string;
    readonly field              : FiniteField;
    
    readonly steps              : number;
    readonly stateWidth         : number;
    readonly secretInputs       : InputRegisterSpecs[];
    readonly publicInputs       : InputRegisterSpecs[];
    readonly staticRegisters    : ReadonlyRegisterSpecs[];
    readonly constraints        : ConstraintSpecs[];

    readonly extensionFactor    : number;

    readonly applyTransition    : TransitionFunction;
    readonly evaluateConstraints: ConstraintEvaluator;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(config: AirConfig, extensionFactor?: number) {
        this.name = config.name;
        this.field = config.field;

        this.steps = config.steps;
        this.stateWidth = config.stateWidth;
        this.secretInputs = config.secretInputs;
        this.publicInputs = config.publicInputs;
        this.staticRegisters = config.staticRegisters;
        this.constraints = config.constraints;

        this.extensionFactor = getExtensionFactor(this.maxConstraintDegree, extensionFactor);

        this.applyTransition = config.transitionFunction;
        this.evaluateConstraints = config.constraintEvaluator;
    }

    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get publicInputCount(): number {
        return this.publicInputs.length;
    }

    get secretInputCount(): number {
        return this.secretInputs.length;
    }

    get maxConstraintDegree(): number {
        let result = 0;
        for (let constraint of this.constraints) {
            if (constraint.degree > result) {
                result = constraint.degree;
            }
        }
        return result;
    }

    get constraintCount(): number {
        return this.constraints.length;
    }

    get hasSpreadRegisters(): boolean {
        for (let specs of this.secretInputs) { if (specs.pattern === 'spread') return true };
        for (let specs of this.publicInputs) { if (specs.pattern === 'spread') return true };
        for (let specs of this.staticRegisters) { if (specs.pattern === 'spread') return true };
        return false;
    }

    // CONTEXT BUILDER
    // --------------------------------------------------------------------------------------------
    createContext(pInputs: bigint[][]): VerificationContext;
    createContext(pInputs: bigint[][], sInputs: bigint[][]): ProofContext;
    createContext(pInputs: bigint[][], sInputs?: bigint[][]): VerificationContext | ProofContext {

        const field = this.field;
        const traceLength = this.steps;
        const extensionFactor = this.extensionFactor;

        // make sure all inputs are valid
        validateInputs(traceLength, pInputs, this.publicInputCount, sInputs, this.secretInputCount);

        // determine domain size and compute root of unity
        const evaluationDomainSize = traceLength * extensionFactor;
        const rootOfUnity = field.getRootOfUnity(evaluationDomainSize);

        let ctx: EvaluationContext;
        let sRegisters: ReadonlyRegister[] | undefined, sEvaluations: bigint[][] | undefined;
        if (sInputs) {
            // if secret inputs are provided, we are generating STARK proof;
            // so, first compute the entire evaluation domain
            const evaluationDomain = field.getPowerCycle(rootOfUnity);

            // then, build execution trace by picking elements from the
            // domain at positions that evenly divide extension factor
            const executionDomain = field.newVector(traceLength);
            for (let i = 0; i < executionDomain.length; i++) {
                executionDomain[i] = evaluationDomain[i * this.extensionFactor];
            }

            ctx = { field, traceLength, extensionFactor, rootOfUnity, evaluationDomain, executionDomain };

            // build secret registers and compute their evaluation traces
            sRegisters = buildInputRegisters(sInputs, this.secretInputs, true, ctx);
            sEvaluations = sRegisters.map(register => register.getAllEvaluations());
        }
        else {
            // if secret inputs were not provided, we are verifying STARK proof
            // so, no need to compute the entire execution and evaluation domains
            ctx = { field, traceLength, rootOfUnity, extensionFactor };

            if (this.hasSpreadRegisters) {
                const rootOfUnity2 = field.exp(rootOfUnity, BigInt(extensionFactor));
                const executionDomain = field.getPowerCycle(rootOfUnity2);
                ctx = {...ctx, executionDomain };
            }
        }

        // build registers for public inputs and constant values
        const pRegisters = buildInputRegisters(pInputs, this.publicInputs, false, ctx);
        const kRegisters = buildReadonlyRegisters(this.staticRegisters, ctx);

        // build and return the context
        return {...ctx, kRegisters, sRegisters, pRegisters, 
            stateWidth          : this.stateWidth,
            constraintCount     : this.constraintCount,
            secretInputCount    : this.secretInputCount,
            publicInputCount    : this.publicInputCount,
            sEvaluations        : sEvaluations
        };
    }

    // EXECUTION
    // --------------------------------------------------------------------------------------------
    generateExecutionTrace(initValues: bigint[], ctx: ProofContext): Vector[] {

        const steps = ctx.traceLength - 1;
        const trace = new Array<bigint[]>(ctx.stateWidth);
        const rValues = new Array<bigint>(ctx.stateWidth);
        const nValues = new Array<bigint>(ctx.stateWidth);
        const sValues = new Array<bigint>(ctx.sRegisters.length);
        const pValues = new Array<bigint>(ctx.pRegisters.length);
        const kValues = new Array<bigint>(ctx.kRegisters.length);

        // make sure all initial values are valid
        validateInitValues(initValues, this.stateWidth);

        // initialize rValues and set first state of execution trace to initValues
        for (let register = 0; register < trace.length; register++) {
            trace[register] = this.field.newVector(ctx.traceLength);
            trace[register][0] = rValues[register] = initValues[register];
        }

        // apply transition function for each step
        let step = 0;
        while (step < steps) {
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

    evaluateExtendedTrace(extendedTrace: Vector[], ctx: ProofContext): Vector[] {

        const domainSize = ctx.evaluationDomain.length;
        const constraintCount = this.constraintCount;
        const extensionFactor = this.extensionFactor;

        // make sure evaluation trace is valid
        validateExtendedTrace(extendedTrace, this.stateWidth, domainSize);

        // initialize evaluation arrays
        const evaluations = new Array<bigint[]>(constraintCount);
        for (let i = 0; i < constraintCount; i++) {
            evaluations[i] = this.field.newVector(domainSize);
        }

        const nfSteps = domainSize - extensionFactor;
        const rValues = new Array<bigint>(ctx.stateWidth);
        const nValues = new Array<bigint>(ctx.stateWidth);
        const sValues = new Array<bigint>(ctx.sRegisters.length);
        const pValues = new Array<bigint>(ctx.pRegisters.length);
        const kValues = new Array<bigint>(ctx.kRegisters.length);
        const qValues = new Array<bigint>(constraintCount);

        // evaluate constraints for each position of the extended trace
        for (let position = 0; position < domainSize; position++) {

            // set values for mutable registers for current and next steps
            for (let register = 0; register < ctx.stateWidth; register++) {
                rValues[register] = extendedTrace[register][position];

                let nextStepIndex = (position + extensionFactor) % domainSize;
                nValues[register] = extendedTrace[register][nextStepIndex];
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
            this.evaluateConstraints(rValues, nValues, kValues, sValues, pValues, qValues);

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
    evaluateConstraintsAt(x: bigint, rValues: bigint[], nValues: bigint[], sValues: bigint[], ctx: VerificationContext): bigint[] {
        
         // get values of readonly registers for the current position
         const kValues = new Array<bigint>(ctx.kRegisters.length);
         for (let i = 0; i < kValues.length; i++) {
            kValues[i] = ctx.kRegisters[i].getEvaluationAt(x);
        }

        // get values of public inputs for the current position
        const pValues = new Array<bigint>(ctx.pRegisters.length);
        for (let i = 0; i < pValues.length; i++) {
            pValues[i] = ctx.pRegisters[i].getEvaluationAt(x);
        }

        // populate qValues with constraint evaluations
        const qValues = new Array<bigint>(this.constraints.length);
        this.evaluateConstraints(rValues, nValues, kValues, sValues, pValues, qValues);

        return qValues;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function buildReadonlyRegisters(specs: ReadonlyRegisterSpecs[], ctx: EvaluationContext): ReadonlyRegister[] {
    const registers: ReadonlyRegister[] = [];

    for (let s of specs) {
        if (s.pattern === 'repeat') {
            let register = new RepeatRegister(s.values, ctx);
            registers.push(register);
        }
        else if (s.pattern === 'spread') {
            let register = new SpreadRegister(s.values, ctx);
            registers.push(register);
        }
        else {
            throw new TypeError(`Invalid value pattern '${s.pattern}'`);
        }
    }

    return registers;
}

function buildInputRegisters(inputs: bigint[][], specs: InputRegisterSpecs[], isSecret: boolean, ctx: EvaluationContext): ReadonlyRegister[] {
    const regSpecs = new Array<ReadonlyRegisterSpecs>(inputs.length);
    for (let i = 0; i < inputs.length; i++) {
        let binary = specs[i].binary;
        if (binary) {
            for (let value of inputs[i]) {
                if (value !== ctx.field.zero && value !== ctx.field.one) {
                    let registerName = isSecret ? `$s${i}` : `$p${i}`;
                    throw new Error(`Invalid definition for readonly register ${registerName}: the register can contain only binary values`);
                }
            }
        }

        regSpecs[i] = { values: inputs[i], pattern: specs[i].pattern, binary };
    }
    return buildReadonlyRegisters(regSpecs, ctx);
}

function getExtensionFactor(maxConstraintDegree: number, extensionFactor?: number): number {
    if (!extensionFactor) {
        return 2**Math.ceil(Math.log2(maxConstraintDegree * 2));
    }
    else {
        return extensionFactor;
    }
}

// VALIDATORS
// ================================================================================================
function validateInputs(traceLength: number, pInputs: bigint[][], pInputCount: number, sInputs?: bigint[][], sInputCount?: number) {

    // validate public inputs
    if (!pInputs) throw new TypeError('Public inputs are undefined');
    if (!Array.isArray(pInputs)) throw new TypeError('Public inputs parameter must be an array');
    if (pInputs.length !== pInputCount) {
        throw new Error(`Public inputs array must contain exactly ${pInputCount} elements`);
    }

    for (let i = 0; i < pInputCount; i++) {
        let input = pInputs[i];
        if (!Array.isArray(input)) {
            throw new TypeError(`Public input ${i} is invalid: an input must contain an array of values`);
        }

        if (traceLength % input.length !== 0) {
            throw new Error(`Public input ${i} is invalid: number of values must be a divisor of ${traceLength}`);
        }

        for (let j = 0; j < input.length; j++) {
            if (typeof input[j] !== 'bigint') {
                throw new TypeError(`Public input ${i} is invalid: value '${input[j]}' is not a BigInt`);
            }
        }
    }

    // validate private inputs
    if (sInputs) {
        if (!Array.isArray(sInputs)) throw new TypeError('Secret inputs parameter must be an array');
        if (sInputs.length !== sInputCount) {
            throw new Error(`Secret inputs array must contain exactly ${sInputCount} elements`);
        }

        for (let i = 0; i < sInputCount; i++) {
            let input = sInputs[i];
            if (!Array.isArray(input)) {
                throw new TypeError(`Secret input ${i} is invalid: an input must contain an array of values`);
            }
    
            if (traceLength % input.length !== 0) {
                throw new Error(`Secret input ${i} is invalid: number of values must be a divisor of ${traceLength}`);
            }
    
            for (let j = 0; j < input.length; j++) {
                if (typeof input[j] !== 'bigint') {
                    throw new TypeError(`Secret input ${i} is invalid: value '${input[j]}' is not a BigInt`);
                }
            }
        }
    }
}

function validateInitValues(values: bigint[], stateWidth: number) {
    if (!values) throw new TypeError('Initial values are undefined');
    if (!Array.isArray(values)) throw new TypeError('Initial values parameter must be an array');
    if (values.length !== stateWidth) {
        throw new Error(`Initial values array must contain exactly ${stateWidth} elements`);
    }

    for (let i = 0; i < stateWidth; i++) {
        if (typeof values[i] !== 'bigint') {
            throw new TypeError(`Initial value ${i} is invalid: value '${values[i]}' is not a BigInt`);
        }
    }
}

function validateExtendedTrace(trace: Vector[], stateWidth: number, domainSize: number) {
    if (!trace) throw new TypeError('Extended trace is undefined');
    if (!Array.isArray(trace)) throw new TypeError('Evaluation trace parameter must be an array');
    if (trace.length !== stateWidth) {
        throw new Error(`Extended trace array must contain exactly ${stateWidth} elements`);
    }

    for (let i = 0; i < stateWidth; i++) {
        const values = trace[i];

        if (!Array.isArray(values)) {
            throw new TypeError(`Extended trace element ${i} is invalid: trace element must be an array`);
        }

        if (values.length !== domainSize) {
            throw new TypeError(`Extended trace element ${i} is invalid: trace element must ${domainSize} values`);
        }
    }
}