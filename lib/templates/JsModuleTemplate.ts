// INTERFACE IMPORTS
// ================================================================================================
import {
    FiniteField, Matrix, Vector, ConstraintSpecs, TransitionFunction, ConstraintEvaluator,
    ReadonlyRegisterGroup, ReadonlyRegisterSpecs, InputRegisterSpecs, ReadonlyRegisterEvaluator,
    InputBlockDescriptor, ProofObject, VerificationObject
} from "@guildofweavers/air-script";

// MODULE VARIABLE PLACEHOLDERS
// ================================================================================================
const f: FiniteField = undefined as any;
const stateWidth = 0;

const registerSpecs: ReadonlyRegisterGroup = { staticRegisters: [], secretRegisters: [], publicRegisters: [] };
const loops: InputBlockDescriptor = { registerDepths: [], baseCycleMasks: [], baseCycleLength: 0 };
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
export function initProof(initValues: bigint[], pInputs: bigint[][], sInputs: bigint[][]): ProofObject {

    // validate inputs
    const { traceLength, traceShape, iRegisterSpecs } = validateInitValues(initValues);
    validateStaticRegisterValues(traceLength);
    validateInputRegisterValues(pInputs, traceLength, 'public');
    validateInputRegisterValues(sInputs, traceLength, 'secret');
    const cRegisterSpecs = buildControlRegisterSpecs(traceShape, traceLength);

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
    const hiddenRegisterTraces: Vector[] = [];

    // build readonly registers
    const kRegisters = buildReadonlyRegisterEvaluators(registerSpecs.staticRegisters, false);
    const pRegisters = buildInputRegisterEvaluators(pInputs, registerSpecs.publicRegisters, false);
    const sRegisters = buildInputRegisterEvaluators(sInputs, registerSpecs.secretRegisters, true);
    const cRegisters = buildReadonlyRegisterEvaluators(cRegisterSpecs, false);
    const iRegisters = buildReadonlyRegisterEvaluators(iRegisterSpecs, true);

    // EXECUTION TRACE GENERATOR
    // --------------------------------------------------------------------------------------------
    function generateExecutionTrace(): Matrix {
        const steps = traceLength - 1;
        
        const kValues = new Array<bigint>(kRegisters.length).fill(f.zero);
        const sValues = new Array<bigint>(sRegisters.length).fill(f.zero);
        const pValues = new Array<bigint>(pRegisters.length).fill(f.zero);
        const cValues = new Array<bigint>(2**cRegisters.length).fill(f.zero);
        const iValues = new Array<bigint>(iRegisters.length).fill(f.zero);

        // build the first row of the execution trace by execution transition function at the last step
        let rValues = new Array<bigint>(stateWidth).fill(f.zero);
        populateControlValues(cRegisters, cValues, steps * compositionFactor);
        for (let i = 0; i < iValues.length; i++) {
            iValues[i] = iRegisters[i](steps * compositionFactor);
        }
        let nValues = applyTransition(rValues, kValues, sValues, pValues, cValues, iValues);

        // initialize execution trace and copy over the first row
        const traceValues = new Array<bigint[]>(stateWidth);
        for (let register = 0; register < traceValues.length; register++) {
            traceValues[register] = new Array<bigint>(traceLength);
            traceValues[register][0] = nValues[register];
            rValues[register] = nValues[register];
        }

        // apply transition function for each step
        let step = 0;
        while (step < steps) {
            let position = step * compositionFactor;

            // get values of readonly registers for the current step
            for (let i = 0; i < kValues.length; i++) {
                kValues[i] = kRegisters[i](position);
            }

            // get values of secret input registers for the current step
            for (let i = 0; i < sValues.length; i++) {
                sValues[i] = sRegisters[i](position);
            }

            // get values of public input registers for the current step
            for (let i = 0; i < pValues.length; i++) {
                pValues[i] = pRegisters[i](position);
            }

            // get values of control registers for the current step
            populateControlValues(cRegisters, cValues, position);

            // get values of init registers for the current step
            for (let i = 0; i < iValues.length; i++) {
                iValues[i] = iRegisters[i](position);
            }

            // populate nValues with the next computation state
            nValues = applyTransition(rValues, kValues, sValues, pValues, cValues, iValues);

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

        const nfSteps = domainSize - compositionFactor;
        const rValues = new Array<bigint>(stateWidth);
        const nValues = new Array<bigint>(stateWidth);
        const kValues = new Array<bigint>(kRegisters.length);
        const sValues = new Array<bigint>(sRegisters.length);
        const pValues = new Array<bigint>(pRegisters.length);
        const cValues = new Array<bigint>(2**cRegisters.length);
        const iValues = new Array<bigint>(iRegisters.length);

        // evaluate constraints for each position of the extended trace
        let qValues: bigint[]
        for (let position = 0; position < domainSize; position++) {

            // set values for mutable registers for current and next steps
            for (let register = 0; register < stateWidth; register++) {
                rValues[register] = tEvaluations.getValue(register, position);

                let nextStepIndex = (position + compositionFactor) % domainSize;
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
            populateControlValues(cRegisters, cValues, position);

            // get values of init registers for the current step
            for (let i = 0; i < iValues.length; i++) {
                iValues[i] = iRegisters[i](position);
            }

            // populate qValues with results of constraint evaluations
            qValues = evaluateConstraints(rValues, nValues, kValues, sValues, pValues, cValues, iValues);

            // copy evaluations to the result, and also check that constraints evaluate to 0
            // at multiples of the extensions factor
            if (position % compositionFactor === 0 && position < nfSteps) {
                for (let constraint = 0; constraint < constraintCount; constraint++) {
                    let qValue = qValues[constraint];
                    if (qValue !== 0n) {
                        throw new Error(`Constraint ${constraint} didn't evaluate to 0 at step: ${position / compositionFactor}`);
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
    function buildReadonlyRegisterEvaluators(specs: ReadonlyRegisterSpecs[], isHidden: boolean): ReadonlyRegisterEvaluator<number>[] {
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
                if (isHidden) {
                    // figure out how many times the evaluations vector needs to be doubled to reach domain size
                    const i = Math.log2(evaluationDomain.length / evaluations.length);
                    hiddenRegisterTraces.push((i > 0) ? f.duplicateVector(evaluations, i) : evaluations);
                }

                // return evaluator function
                return (position) => evaluations.getValue(position % evaluations.length);
            }
            else if (s.pattern === 'spread') {
                // create trace mask
                const traceValues = stretchRegisterValues(s.values, traceLength);

                // build the polynomial describing spread values
                const trace = f.newVectorFrom(traceValues);
                const poly = f.interpolateRoots(executionDomain, trace);

                // evaluate the polynomial over composition domain
                const evaluations = f.evalPolyAtRoots(poly, compositionDomain);

                // if the register is secret, build its trace over evaluation domain
                if (isHidden) {
                    hiddenRegisterTraces.push(f.evalPolyAtRoots(poly, evaluationDomain));
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
    
    function buildInputRegisterEvaluators(inputs: bigint[][], specs: InputRegisterSpecs[], isHidden: boolean): ReadonlyRegisterEvaluator<number>[] {
        const regSpecs = new Array<ReadonlyRegisterSpecs>(inputs.length);
        for (let i = 0; i < inputs.length; i++) {
            let binary = specs[i].binary;
            if (binary) { validateBinaryValues(inputs[i], isHidden, i); }
            regSpecs[i] = { values: inputs[i], pattern: specs[i].pattern, binary };
        }
        return buildReadonlyRegisterEvaluators(regSpecs, isHidden);
    }

    // CONTEXT OBJECT
    // --------------------------------------------------------------------------------------------
    return {
        field                       : f,
        traceShape                  : traceShape,   // TODO: rename
        traceLength                 : traceLength,
        extensionFactor             : extensionFactor,
        rootOfUnity                 : rootOfUnity,
        stateWidth                  : stateWidth,
        constraintCount             : constraints.length,
        secretInputCount            : registerSpecs.secretRegisters.length,
        publicInputCount            : registerSpecs.publicRegisters.length,
        executionDomain             : executionDomain,
        evaluationDomain            : evaluationDomain,
        compositionDomain           : compositionDomain,
        generateExecutionTrace      : generateExecutionTrace,
        evaluateTracePolynomials    : evaluateTracePolynomials,
        hiddenRegisterTraces        : hiddenRegisterTraces
    };
}

// VERIFICATION OBJECT GENERATOR
// ================================================================================================
export function initVerification(traceShape: number[], pInputs: bigint[][]): VerificationObject {
    
    const traceLength = validateTraceShape(traceShape);
    validateStaticRegisterValues(traceLength);
    validateInputRegisterValues(pInputs, traceLength, 'public');
    const cRegisterSpecs = buildControlRegisterSpecs(traceShape, traceLength);
        
    const evaluationDomainSize = traceLength * extensionFactor;
    const rootOfUnity = f.getRootOfUnity(evaluationDomainSize);

    // build static, public, and control register evaluators
    const kRegisters = buildReadonlyRegisterEvaluators(registerSpecs.staticRegisters);
    const pRegisters = buildInputRegisterEvaluators(pInputs, registerSpecs.publicRegisters);
    const cRegisters = buildReadonlyRegisterEvaluators(cRegisterSpecs);

    const iRegistersOffset = registerSpecs.secretRegisters.length;

    // CONSTRAINT EVALUATOR
    // --------------------------------------------------------------------------------------------
    function evaluateConstraintsAt(x: bigint, rValues: bigint[], nValues: bigint[], hValues: bigint[]): bigint[] {
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
        const cValues = new Array<bigint>(2**cRegisters.length);
        populateControlValues(cRegisters, cValues, x);

        // split hidden values into secret and init register values
        const sValues = hValues.slice(0, iRegistersOffset);
        const iValues = hValues.slice(iRegistersOffset);

        // populate qValues with constraint evaluations
        const qValues = evaluateConstraints(rValues, nValues, kValues, sValues, pValues, cValues, iValues);
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
                const traceValues = stretchRegisterValues(s.values, traceLength);

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

    function buildInputRegisterEvaluators(inputs: bigint[][], specs: InputRegisterSpecs[]): ReadonlyRegisterEvaluator<bigint>[] {
        const regSpecs = new Array<ReadonlyRegisterSpecs>(inputs.length);
        for (let i = 0; i < inputs.length; i++) {
            let binary = specs[i].binary;
            if (binary) { validateBinaryValues(inputs[i], false, i); }
            regSpecs[i] = { values: inputs[i], pattern: specs[i].pattern, binary };
        }
        return buildReadonlyRegisterEvaluators(regSpecs);
    }

    // CONTEXT OBJECT
    // --------------------------------------------------------------------------------------------
    return {
        field                       : f,
        traceShape                  : traceShape,
        traceLength                 : traceLength,
        extensionFactor             : extensionFactor,
        rootOfUnity                 : rootOfUnity,
        stateWidth                  : stateWidth,
        constraintCount             : constraints.length,
        secretInputCount            : registerSpecs.secretRegisters.length,
        publicInputCount            : registerSpecs.publicRegisters.length,
        evaluateConstraintsAt       : evaluateConstraintsAt
    };
}

// HELPER FUNCTIONS
// ================================================================================================
export function validateInitValues(initValues: any[]): { traceLength: number, traceShape: number[], iRegisterSpecs: ReadonlyRegisterSpecs[] } {

    const registerDepths = loops.registerDepths;
    const traceShape: number[] = [initValues.length];
    const iRegisterValues = new Array<bigint[]>(registerDepths.length).fill([]);
    for (let value of initValues) {
        for (let i = 0; i < registerDepths.length; i++) {
            let uv = unrollRegisterValues(value[i], i, registerDepths[i], traceShape);
            iRegisterValues[i] = iRegisterValues[i].concat(uv);
        }
    }

    const cycleCount = traceShape.reduce((p, c) => p * c, 1);
    for (let i = 0; i < iRegisterValues.length; i++) {
        iRegisterValues[i] = stretchRegisterValues(iRegisterValues[i], cycleCount);
        iRegisterValues[i].push(iRegisterValues[i].shift()!);
    }

    const traceLength = cycleCount * loops.baseCycleLength;
    if (traceLength > maxTraceLength) {
        throw new Error(`total trace length cannot exceed ${maxTraceLength}`);
    }

    const iRegisterSpecs: ReadonlyRegisterSpecs[] = iRegisterValues.map(v => {
        return { values: v, binary: false, pattern: 'spread' };
    });

    return { traceLength, traceShape, iRegisterSpecs };
}

export function validateTraceShape(traceShape: number[]): number {
    if (traceShape === undefined) throw new Error('trace shape was not provided');
    if (!Array.isArray(traceShape)) throw new Error('trace shape must be an array');
    if (traceShape.length === 0) throw new Error('trace shape array must contain at least one element');

    let cycleCount = 1;
    for (let i = 0; i < traceShape.length; i++) {
        if (!Number.isInteger(traceShape[i]) || traceShape[i] < 1) {
            throw new Error('trace shape elements must be integers greater than 0');
        }
        cycleCount = cycleCount * traceShape[i];
    }

    const traceLength = cycleCount * loops.baseCycleLength;
    if (traceLength > maxTraceLength) {
        throw new Error(`total trace length cannot exceed ${maxTraceLength}`);
    }

    return traceLength;
}

export function validateStaticRegisterValues(traceLength: number): void {
    for (let i = 0; i < registerSpecs.staticRegisters.length; i++) {
        if (traceLength % registerSpecs.staticRegisters[i].values.length !== 0) {
            throw new Error(`invalid definition for static register $k${i}: number of values must be a divisor of ${traceLength}`);
        }
    }
}

export function validateInputRegisterValues(inputs: bigint[][], traceLength: number, type: 'public' | 'secret'): void {
    if (!inputs) throw new TypeError(`${type} inputs are undefined`);
    if (!Array.isArray(inputs)) throw new TypeError(`${type} inputs parameter must be an array`);

    const expectedInputCount = type === 'public' ? registerSpecs.publicRegisters.length : registerSpecs.secretRegisters.length;
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

export function validateBinaryValues(values: bigint[], isSecret: boolean, i: number): void {
    for (let value of values) {
        if (value !== f.zero && value !== f.one) {
            let registerName = isSecret ? `$s${i}` : `$p${i}`;
            throw new Error(`Invalid definition for readonly register ${registerName}: the register can contain only binary values`);
        }
    }
}

export function buildControlRegisterSpecs(traceShape: number[], traceLength: number): ReadonlyRegisterSpecs[] {
    
    const masks: number[][] = [];

    // derive input loop trace masks from trace shape
    let period = traceLength;
    let baseline = new Array<number>(period / traceShape[0]);
    for (let i = 0; i < traceShape.length; i++) {
        period = period / traceShape[i];
        let mask = new Array<number>(period - 1).fill(0); mask.push(1);
        masks[i] = new Array<number>(baseline.length);
        for (let j = 0; j < baseline.length; j++) {
            masks[i][j] = mask[j % period] ^ baseline[j];
            baseline[j] = mask[j % period] | baseline[j];
        }
    }

    // combine input loop trace masks with segment loop trace masks
    for (let cycleMask of loops.baseCycleMasks) {
        // move the init step mask to the end
        let mask = cycleMask.slice(1); mask.push(0);

        // make sure all masks have the same length
        while(mask.length < baseline.length) {
            mask = mask.concat(mask);
        }
        masks.push(mask);
    }

    // transform masks into a set of static register values
    const values: bigint[][] = [];
    const loopCount = Math.ceil(Math.log2(masks.length));
    for (let i = 0; i < loopCount; i++) {
        values.push(new Array<bigint>(baseline.length));
    }

    let p = 0;
    for (let mask of masks) {
        let key = p.toString(2).padStart(loopCount, '0');
        for (let i = 0; i < mask.length; i++) {
            for (let j = 0; j < loopCount; j++) {
                if (mask[i] === 1) {
                    values[j][i] = (key.charAt(j) === '0') ? f.zero : f.one;
                }
            }
        }
        p++;
    }

    for (let i = 0; i < values.length; i++) {
        values[i] = removeRepeatingCycles(values[i]);
    }

    // transform values into register specs and return
    return values.map(v => ({ values: v, binary: true, pattern: 'repeat'}));
}

export function stretchRegisterValues(values: bigint[], traceLength: number): bigint[] {
    const traceValues = new Array<bigint>(traceLength)
    const stretchLength = traceLength / values.length;

    let start = 0;
    for (let i = 0; i < values.length; i++, start += stretchLength) {
        traceValues.fill(values[i], start, start + stretchLength);
    }

    return traceValues;
}

export function unrollRegisterValues(value: any[] | bigint, register: number, depth: number, shape: number[]): bigint[] {
    if (typeof value === 'bigint') {
        if (depth !== 0)
            throw new Error(`values provided for register $i${register} do not match the expected template`);
        return [value];
    }
    else {
        if (depth === 0)
            throw new Error(`values provided for register $i${register} do not match the expected template`);
        if (!Array.isArray(value))
            throw new Error(`value provided for register $i${register} at depth ${depth} is invalid`);
        else if (value.length === 0)
            throw new Error(`number of values for register $i${register} at depth ${depth} must be greater than 0`);
        else if (!isPowerOf2(value.length)) 
            throw new Error(`number of values for register $i${register} at depth ${depth} must be a power of 2`);

        if (shape[depth] === undefined) {
            shape[depth] = value.length;
        }
        else if (value.length !== shape[depth]) {
            throw new Error(`values provided for register $i${register} do not match the expected template`);
        }

        let result: bigint[] = [];
        for (let i = 0; i < value.length; i++) {
            result = [...result, ...unrollRegisterValues(value[i], register, depth - 1, shape)];
        }
        return result;
    }
}

export function removeRepeatingCycles(values: bigint[]): bigint[] {
    const halfLength = values.length / 2;
    for (let i = 0; i < halfLength; i++) {
        if (values[i] !== values[i + halfLength]) {
            return values;
        }        
    }
    return removeRepeatingCycles(values.slice(halfLength));
}

export function populateControlValues<T extends number | bigint>(cRegisters: ReadonlyRegisterEvaluator<T>[], cValues: bigint[], position: T): void {
    let cPeriod = 1;
    cValues.fill(f.one);

    for (let i = cRegisters.length - 1; i >= 0; i--) {
        let j = 0;

        let value = cRegisters[i](position);
        for (; j < cPeriod; j++) {
            cValues[j] = f.mul(cValues[j], value);
        }

        value = f.sub(f.one, value);
        cPeriod = cPeriod * 2;
        for (; j < cPeriod; j++) {
            cValues[j] = f.mul(cValues[j], value);
        }

        for (; j < cValues.length; j++) {
            cValues[j] = cValues[j - cPeriod];
        }
    }

    cValues.reverse();
}

export function isPowerOf2(value: number){
    return (value !== 0) && (value & (value - 1)) === 0;
}