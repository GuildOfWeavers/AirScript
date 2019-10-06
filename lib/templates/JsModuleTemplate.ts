// INTERFACE IMPORTS
// ================================================================================================
import {
    ProofObject, VerificationObject, ConstraintSpecs, ReadonlyRegisterSpecs, InputRegisterSpecs,
    ReadonlyRegisterEvaluator, FiniteField, Matrix, Vector, TransitionFunction, ConstraintEvaluator
} from "@guildofweavers/air-script";

// INTERFACES
// ================================================================================================
export interface RegisterSpecs {
    k: ReadonlyRegisterSpecs[],
    s: InputRegisterSpecs[],
    p: InputRegisterSpecs[]
}

// MODULE VARIABLE PLACEHOLDERS
// ================================================================================================
const f: FiniteField = undefined as any;
const stateWidth = 0;
const baseCycleLength = 0;
const initValueTemplate: number[] = [];
const loopSegmentMasks: string[] = [];

const registerSpecs: RegisterSpecs = { k: [], s: [], p: [] };
const constraints: ConstraintSpecs[] = [];

const compositionFactor = 0;
const extensionFactor = 0;
const maxTraceLength = 0;

// GENERATED FUNCTION PLACEHOLDERS
// ================================================================================================
const applyTransition: TransitionFunction = function () { return []; }
const evaluateConstraints: ConstraintEvaluator = function () { return []; }

// PROOF OBJECT GENERATOR
// ================================================================================================
export function initProof(pInputs: bigint[][], sInputs: bigint[][], initValues: bigint[]): ProofObject {

    // validate init values and calculate trace length
    const cycleTemplate = getCycleTemplate(initValues);
    const baseCycleCount = cycleTemplate.reduce((p, c) => p * c, 1);
    const outerCycleLength = baseCycleCount * baseCycleLength;
    const traceLength = outerCycleLength * initValues.length;

    if (traceLength > maxTraceLength) {
        throw new Error(`total trace length cannot exceed ${maxTraceLength}`);
    }

    validateStaticRegisterValues(traceLength);
    validateInputRegisterValues(pInputs, traceLength, 'public');
    validateInputRegisterValues(sInputs, traceLength, 'secret');

    // build evaluation domain
    const evaluationDomainSize = traceLength * extensionFactor;
    const rootOfUnity = f.getRootOfUnity(evaluationDomainSize);
    const evaluationDomain = f.getPowerSeries(rootOfUnity, evaluationDomainSize);

    // build execution and composition domains by plucking values from evaluation domain
    const eSkip = extensionFactor;
    const executionDomain = f.pluckVector(evaluationDomain, eSkip, traceLength);

    const cSkip = extensionFactor / compositionFactor;
    const compositionDomainLength = traceLength * compositionFactor;
    const compositionDomain = f.pluckVector(evaluationDomain, cSkip, compositionDomainLength);

    // create a variable to hold secret register traces
    const sRegisterTraces: Vector[] = [];

    // build readonly registers
    const kRegisters = buildReadonlyRegisterEvaluators(registerSpecs.k, false);
    const pRegisters = buildInputRegisterEvaluators(pInputs, registerSpecs.p, false);
    const sRegisters = buildInputRegisterEvaluators(sInputs, registerSpecs.s, true);
    const cRegisters = buildControlRegisterEvaluators();

    // EXECUTION TRACE GENERATOR
    // --------------------------------------------------------------------------------------------
    function generateExecutionTrace(): Matrix {
        const steps = traceLength - 1;
        
        const sValues = new Array<bigint>(sRegisters.length);
        const pValues = new Array<bigint>(pRegisters.length);
        const kValues = new Array<bigint>(kRegisters.length);
        const cValues = new Array<bigint>(cRegisters.length);

        // initialize rValues and set first state of execution trace to initValues
        let nValues: bigint[];
        let rValues = new Array<bigint>(stateWidth);
        const traceValues = new Array<bigint[]>(stateWidth);
        for (let register = 0; register < traceValues.length; register++) {
            traceValues[register] = new Array<bigint>(traceLength);
            traceValues[register][0] = rValues[register] = initValues[register];
        }

        // apply transition function for each step
        let step = 0;
        while (step < steps) {
            // get values of readonly registers for the current step
            for (let i = 0; i < kValues.length; i++) {
                kValues[i] = kRegisters[i](step * compositionFactor);
            }

            // get values of secret input registers for the current step
            for (let i = 0; i < sValues.length; i++) {
                sValues[i] = sRegisters[i](step * compositionFactor);
            }

            // get values of public input registers for the current step
            for (let i = 0; i < pValues.length; i++) {
                pValues[i] = pRegisters[i](step * compositionFactor);
            }

            // get values of control registers for the current step
            for (let i = 0; i < cValues.length; i++) {
                cValues[i] = cRegisters[i](step * compositionFactor);
            }

            // populate nValues with the next computation state
            nValues = applyTransition(rValues, kValues, sValues, pValues, cValues);

            // copy nValues to execution trace and update rValues for the next iteration
            step++;
            for (let register = 0; register < nValues.length; register++) {
                traceValues[register][step] = nValues[register];
                rValues = nValues;
            }
        }

        return f.newMatrixFrom(traceValues);
    }

    // TRACE EVALUATOR
    // --------------------------------------------------------------------------------------------
    function evaluateTracePolynomials(polynomials: Matrix): Matrix {

        const domainSize = compositionDomain.length;
        const extensionFactor = domainSize / traceLength;
        const constraintCount = constraints.length;

        // make sure trace polynomials are valid
        validateTracePolynomials(polynomials, traceLength);

        // evaluate transition polynomials over composition domain
        const tEvaluations = f.evalPolysAtRoots(polynomials, compositionDomain);

        // initialize evaluation arrays
        const evaluations = new Array<bigint[]>(constraintCount);
        for (let i = 0; i < constraintCount; i++) {
            evaluations[i] = new Array<bigint>(domainSize);
        }

        const nfSteps = domainSize - extensionFactor;
        const rValues = new Array<bigint>(stateWidth);
        const nValues = new Array<bigint>(stateWidth);
        const kValues = new Array<bigint>(kRegisters.length);
        const sValues = new Array<bigint>(sRegisters.length);
        const pValues = new Array<bigint>(pRegisters.length);
        const cValues = new Array<bigint>(cRegisters.length);

        // evaluate constraints for each position of the extended trace
        let qValues: bigint[]
        for (let position = 0; position < domainSize; position++) {

            // set values for mutable registers for current and next steps
            for (let register = 0; register < stateWidth; register++) {
                rValues[register] = tEvaluations.getValue(register, position);

                let nextStepIndex = (position + extensionFactor) % domainSize;
                nValues[register] = tEvaluations.getValue(register, nextStepIndex);
            }

            // get values of readonly registers for the current position
            for (let i = 0; i < kValues.length; i++) {
                kValues[i] = kRegisters[i](position);
            }

            // get values of secret input registers for the current position
            for (let i = 0; i < sValues.length; i++) {
                sValues[i] = sRegisters[i](position);
            }

            // get values of public input registers for the current position
            for (let i = 0; i < pValues.length; i++) {
                pValues[i] = pRegisters[i](position);
            }

            // get values of control registers for the current step
            for (let i = 0; i < cValues.length; i++) {
                cValues[i] = cRegisters[i](position);
            }

            // populate qValues with results of constraint evaluations
            qValues = evaluateConstraints(rValues, nValues, kValues, sValues, pValues, cValues);

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

        return f.newMatrixFrom(evaluations);
    }

    // REGISTER BUILDERS
    // --------------------------------------------------------------------------------------------
    function buildReadonlyRegisterEvaluators(specs: ReadonlyRegisterSpecs[], isSecret: boolean): ReadonlyRegisterEvaluator<number>[] {
        const registers: ReadonlyRegisterEvaluator<number>[] = specs.map(s => {
            if (s.pattern === 'repeat') {
                // make sure the length of values is at least 4; this is needed for FFT interpolation
                if (s.values.length === 2) { s.values = s.values.concat(s.values); }

                // build the polynomial describing cyclic values
                const skip = compositionDomainLength / s.values.length;
                const ys = f.newVectorFrom(s.values);
                const xs = f.pluckVector(compositionDomain, skip, ys.length);
                const poly = f.interpolateRoots(xs, ys);

                // evaluate the polynomial over a subset of composition domain
                const length2 = s.values.length * compositionFactor;
                const skip2 = compositionDomainLength / length2;
                const xs2 = f.pluckVector(compositionDomain, skip2, length2);
                const evaluations = f.evalPolyAtRoots(poly, xs2);

                // if the register is secret, build its trace over evaluation domain
                if (isSecret) {
                    // figure out how many times the evaluations vector needs to be doubled to reach domain size
                    const i = Math.log2(evaluationDomain.length / evaluations.length);
                    sRegisterTraces.push((i > 0) ? f.duplicateVector(evaluations, i) : evaluations);
                }

                // return evaluator function
                return (position) => evaluations.getValue(position % evaluations.length);
            }
            else if (s.pattern === 'spread') {
                // create trace mask
                const traceValues = buildTraceMask(s.values, traceLength);

                // build the polynomial describing spread values
                const trace = f.newVectorFrom(traceValues);
                const poly = f.interpolateRoots(executionDomain, trace);

                // evaluate the polynomial over composition domain
                const evaluations = f.evalPolyAtRoots(poly, compositionDomain);

                // if the register is secret, build its trace over evaluation domain
                if (isSecret) {
                    sRegisterTraces.push(f.evalPolyAtRoots(poly, evaluationDomain));
                }

                // return evaluator function
                return (position) => evaluations.getValue(position % evaluations.length);
            }
            else {
                throw new TypeError(`Invalid value pattern '${s.pattern}'`);
            }
        });
        return registers;
    }
    
    function buildInputRegisterEvaluators(inputs: bigint[][], specs: InputRegisterSpecs[], isSecret: boolean): ReadonlyRegisterEvaluator<number>[] {
        const regSpecs = new Array<ReadonlyRegisterSpecs>(inputs.length);
        for (let i = 0; i < inputs.length; i++) {
            let binary = specs[i].binary;
            if (binary) { validateBinaryValues(inputs[i], isSecret, i); }
            regSpecs[i] = { values: inputs[i], pattern: specs[i].pattern, binary };
        }
        return buildReadonlyRegisterEvaluators(regSpecs, isSecret);
    }

    function buildControlRegisterEvaluators(): ReadonlyRegisterEvaluator<number>[] {
        const masks = buildInputMasks([1, ...cycleTemplate]);   // TODO
        const maskLength = masks[0].length;

        for (let mask of loopSegmentMasks) {
            while (mask.length < maskLength) { mask = mask + mask; }
            masks.push(mask);
        }

        const values = buildControlRegisterValues(masks);
        const regSpecs = new Array<ReadonlyRegisterSpecs>(values.length);
        for (let i = 0; i < values.length; i++) {
            regSpecs[i] = { values: values[i], pattern: 'repeat', binary: true };
        }
        return buildReadonlyRegisterEvaluators(regSpecs, false);
    }

    // CONTEXT OBJECT
    // --------------------------------------------------------------------------------------------
    return {
        field                       : f,
        traceLength                 : traceLength,
        extensionFactor             : extensionFactor,
        rootOfUnity                 : rootOfUnity,
        stateWidth                  : stateWidth,
        constraintCount             : constraints.length,
        secretInputCount            : registerSpecs.s.length,
        publicInputCount            : registerSpecs.p.length,
        executionDomain             : executionDomain,
        evaluationDomain            : evaluationDomain,
        compositionDomain           : compositionDomain,
        generateExecutionTrace      : generateExecutionTrace,
        evaluateTracePolynomials    : evaluateTracePolynomials,
        secretRegisterTraces        : sRegisterTraces
    };
}

// VERIFICATION OBJECT GENERATOR
// ================================================================================================
export function initVerification(pInputs: bigint[][]): VerificationObject {
    
    const traceLength = baseCycleLength;  // TODO
    validateStaticRegisterValues(traceLength);
    validateInputRegisterValues(pInputs, traceLength, 'public');
        
    const evaluationDomainSize = traceLength * extensionFactor;
    const rootOfUnity = f.getRootOfUnity(evaluationDomainSize);

    // build static, public, and control register evaluators
    const kRegisters = buildReadonlyRegisterEvaluators(registerSpecs.k);
    const pRegisters = buildInputRegisterEvaluators(pInputs, registerSpecs.p, false);
    const cRegisters = [] as ReadonlyRegisterEvaluator<bigint>[]; // TODO

    // CONSTRAINT EVALUATOR
    // --------------------------------------------------------------------------------------------
    function evaluateConstraintsAt(x: bigint, rValues: bigint[], nValues: bigint[], sValues: bigint[]): bigint[] {
        // get values of readonly registers for the current position
        const kValues = new Array<bigint>(kRegisters.length);
        for (let i = 0; i < kValues.length; i++) {
            kValues[i] = kRegisters[i](x);
        }

        // get values of public inputs for the current position
        const pValues = new Array<bigint>(pRegisters.length);
        for (let i = 0; i < pValues.length; i++) {
            pValues[i] = pRegisters[i](x);
        }

        // get values of control for the current position
        const cValues = new Array<bigint>(cRegisters.length);
        for (let i = 0; i < cValues.length; i++) {
            cValues[i] = cRegisters[i](x);
        }

        // populate qValues with constraint evaluations
        const qValues = evaluateConstraints(rValues, nValues, kValues, sValues, pValues, cValues);
        return qValues;
    }

    // REGISTER EVALUATOR BUILDERS
    // --------------------------------------------------------------------------------------------
    function buildReadonlyRegisterEvaluators(specs: ReadonlyRegisterSpecs[]): ReadonlyRegisterEvaluator<bigint>[] {

        let executionDomain: Vector | undefined;
        const registers: ReadonlyRegisterEvaluator<bigint>[] = specs.map((s => {
            if (s.pattern === 'repeat') {
                // make sure the length of values is at least 4; this is needed for FFT interpolation
                if (s.values.length === 2) { s.values = s.values.concat(s.values); }

                // determine number of cycles over the execution trace
                const cycleCount = BigInt(traceLength / s.values.length);

                // build the polynomial describing cyclic values
                const g = f.exp(rootOfUnity, BigInt(extensionFactor) * cycleCount);
                const ys = f.newVectorFrom(s.values);
                const xs = f.getPowerSeries(g, ys.length);
                const poly = f.interpolateRoots(xs, ys);

                // build and return the evaluator function
                return (x) => f.evalPolyAt(poly, f.exp(x, cycleCount));
            }
            else if (s.pattern === 'spread') {
                // create trace mask
                const traceValues = buildTraceMask(s.values, traceLength);

                // build execution domain
                if (!executionDomain) {
                    const rootOfUnity2 = f.exp(rootOfUnity, BigInt(extensionFactor));
                    executionDomain = f.getPowerSeries(rootOfUnity2, traceLength);
                }

                // build the polynomial describing spread values
                const trace = f.newVectorFrom(traceValues);
                const poly = f.interpolateRoots(executionDomain, trace);

                // build and return the evaluator function
                return (x) => f.evalPolyAt(poly, x);
            }
            else {
                throw new TypeError(`Invalid value pattern '${s.pattern}'`);
            }
        }));

        return registers;
    }

    function buildInputRegisterEvaluators(inputs: bigint[][], specs: InputRegisterSpecs[], isSecret: boolean): ReadonlyRegisterEvaluator<bigint>[] {
        const regSpecs = new Array<ReadonlyRegisterSpecs>(inputs.length);
        for (let i = 0; i < inputs.length; i++) {
            let binary = specs[i].binary;
            if (binary) { validateBinaryValues(inputs[i], isSecret, i); }
            regSpecs[i] = { values: inputs[i], pattern: specs[i].pattern, binary };
        }
        return buildReadonlyRegisterEvaluators(regSpecs);
    }

    // CONTEXT OBJECT
    // --------------------------------------------------------------------------------------------
    return {
        field                       : f,
        traceLength                 : traceLength,
        extensionFactor             : extensionFactor,
        rootOfUnity                 : rootOfUnity,
        stateWidth                  : stateWidth,
        constraintCount             : constraints.length,
        secretInputCount            : registerSpecs.s.length,
        publicInputCount            : registerSpecs.p.length,
        evaluateConstraintsAt       : evaluateConstraintsAt
    };
}

// HELPER FUNCTIONS
// ================================================================================================
export function getCycleTemplate(initValues: any[]): number[] {
    if (!initValues) throw new TypeError('initial values are undefined');
    if (!Array.isArray(initValues)) throw new TypeError('initial values parameter must be an array');
    if (initValues.length === 0) {
        throw new Error(`at least one set of initial values must be provided`);
    }

    const cycleTemplate = validateInitValue(initValues[0]);
    for (let value of initValues) {
        // TODO: validate all other values against the template
    }

    return cycleTemplate;
}

export function validateStaticRegisterValues(traceLength: number): void {
    for (let i = 0; i < registerSpecs.k.length; i++) {
        if (traceLength % registerSpecs.k[i].values.length !== 0) {
            throw new Error(`invalid definition for static register $k${i}: number of values must be a divisor of ${traceLength}`);
        }
    }
}

export function validateInputRegisterValues(inputs: bigint[][], traceLength: number, type: 'public' | 'secret'): void {
    if (!inputs) throw new TypeError(`${type} inputs are undefined`);
    if (!Array.isArray(inputs)) throw new TypeError(`${type} inputs parameter must be an array`);

    const expectedInputCount = type === 'public' ? registerSpecs.p.length : registerSpecs.s.length;
    if (inputs.length !== expectedInputCount) {
        throw new Error(`${type} inputs array must contain exactly ${expectedInputCount} elements`);
    }

    for (let i = 0; i < expectedInputCount; i++) {
        let input = inputs[i];
        if (!Array.isArray(input)) {
            throw new TypeError(`${type} input ${i} is invalid: an input must contain an array of values`);
        }

        if (traceLength % input.length !== 0) {
            throw new Error(`${type} input ${i} is invalid: number of values must be a divisor of ${traceLength}`);
        }

        for (let j = 0; j < input.length; j++) {
            if (typeof input[j] !== 'bigint') {
                throw new TypeError(`${type} input ${i} is invalid: value '${input[j]}' is not a BigInt`);
            }
        }
    }
}

export function validateTracePolynomials(trace: Matrix, traceLength: number): void {
    if (!trace) throw new TypeError('Trace polynomials is undefined');
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

export function buildTraceMask(values: bigint[], traceLength: number): bigint[] {
    const traceValues = new Array<bigint>(traceLength)
    const stretchLength = traceLength / values.length;

    let start = 0;
    for (let i = 0; i < values.length; i++, start += stretchLength) {
        traceValues.fill(values[i], start, start + stretchLength);
    }

    return traceValues;
}

export function validateBinaryValues(values: bigint[], isSecret: boolean, i: number): void {
    for (let value of values) {
        if (value !== f.zero && value !== f.one) {
            let registerName = isSecret ? `$s${i}` : `$p${i}`;
            throw new Error(`Invalid definition for readonly register ${registerName}: the register can contain only binary values`);
        }
    }
}

export function validateInitValue(value: any[]): number[] {
    if (value.length !== initValueTemplate.length) {
        throw new Error(`each initial value array must contain exactly ${initValueTemplate.length} elements`);
    }

    const traceTemplate: number[] = [];
    for (let i = 0; i < value.length; i++) {
        let depth = initValueTemplate[i];
        let shape = validateInitRegister(value[i], i, depth);

        for (let j = 0; j < shape.length; j++) {
            if (traceTemplate.length === j) {
                traceTemplate.push(shape[j]);
            }
            else if (traceTemplate[j] !== shape[j]) {
                throw new Error('TODO');
            }
        }
    }

    return traceTemplate;
}

export function validateInitRegister(inputs: any[] | bigint, register: number, level: number): number[] {
    if (typeof inputs === 'bigint') {
        if (level !== 0) {
            throw new Error(`values provided for register $i${register} do not match the expected template`);
        }
        return [];
    }
    else {
        const result = validateInitRegister(inputs[0], register, level - 1);
        for (let i = 1; i < inputs.length; i++) {
            let result2 = validateInitRegister(inputs[i], register, level - 1);
            for (let j = 0; j < result.length; j++) {
                if (result[j] !== result2[j]) {
                    throw new Error(`values provided for register $i${register} do not match the expected template`);
                }
            }
        }
        return [inputs.length, ...result];
    }
}

export function buildInputMasks(cycleTemplate: number[]): string[] {
    let baseline = '';
    const totalCycles = cycleTemplate.reduce((c, p) => c * p, 1);
    const masks = new Array<string>();
    for (let cycleCount of cycleTemplate) {
        let maskLength = baseCycleLength * (totalCycles / cycleCount);
        let mask = '1' + '0'.repeat(maskLength - 1);
        if (baseline === '') {
            masks.push(mask);
        }
        else {
            while (mask.length < baseline.length) {
                mask = mask + mask;
            }
            masks.push(xor(mask, baseline));
        }
        baseline = mask;
    }
    return masks;
}

export function xor(a: string, b: string) {
    let result = '';
    for (let i = 0; i < a.length; i++) {
        result += (a[i] === b[i]) ? '0' : '1';
    }
    return result;
}

export function buildControlRegisterValues(masks: string[]) {
    const values: bigint[][] = [];
    const loopCount = Math.ceil(Math.log2(masks.length));
    
    for (let i = 0; i < loopCount * 2; i++) {
        values.push(new Array<bigint>(masks[0].length));
    }

    let p = 0;
    for (let mask of masks) {
        let key = p.toString(2).padStart(loopCount, '0');
        for (let i = 0; i < mask.length; i++) {
            for (let j = 0; j < loopCount; j++) {
                if (mask[i] === '1') {
                    let value = key.charAt(j) === '1' ? f.one : f.zero;
                    values[2 * j][i] = value;
                    values[2 * j + 1][i] = f.sub(f.one, value);
                }
            }
        }
        p++;
    }

    for (let i = 0; i < values.length; i++) {
        values[i] = reduceValues(values[i]);
    }

    return values;
}

export function reduceValues(values: bigint[]): bigint[] {
    const halfLength = values.length / 2;
    for (let i = 0; i < halfLength; i++) {
        if (values[i] !== values[i + halfLength]) {
            return values;
        }        
    }
    return reduceValues(values.slice(halfLength));
}