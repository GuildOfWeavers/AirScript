"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// MODULE VARIABLE PLACEHOLDERS
// ================================================================================================
const f = undefined;
const stateWidth = 0;
const registerSpecs = { k: [], s: [], p: [] };
const loopSpecs = { traceTemplate: [], segmentMasks: [], baseCycleLength: 0 };
const constraints = [];
const compositionFactor = 0;
const extensionFactor = 0;
const maxTraceLength = 0;
// GENERATED FUNCTION PLACEHOLDERS
// ================================================================================================
const applyTransition = function () { return []; };
const evaluateConstraints = function () { return []; };
// PROOF OBJECT GENERATOR
// ================================================================================================
function initProof(pInputs, sInputs, initValues) {
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
    const sRegisterTraces = [];
    // build readonly registers
    const kRegisters = buildReadonlyRegisterEvaluators(registerSpecs.k, false);
    const pRegisters = buildInputRegisterEvaluators(pInputs, registerSpecs.p, false);
    const sRegisters = buildInputRegisterEvaluators(sInputs, registerSpecs.s, true);
    const cRegisters = buildReadonlyRegisterEvaluators(cRegisterSpecs, false);
    const iRegisters = buildReadonlyRegisterEvaluators(iRegisterSpecs, true);
    // EXECUTION TRACE GENERATOR
    // --------------------------------------------------------------------------------------------
    function generateExecutionTrace() {
        const steps = traceLength - 1;
        const sValues = new Array(sRegisters.length);
        const pValues = new Array(pRegisters.length);
        const kValues = new Array(kRegisters.length);
        const cValues = new Array(cRegisters.length);
        const iValues = new Array(iRegisters.length);
        // initialize rValues and set first state of execution trace to the last state of init registers
        let nValues;
        let rValues = new Array(stateWidth);
        const traceValues = new Array(stateWidth);
        for (let register = 0; register < traceValues.length; register++) {
            traceValues[register] = new Array(traceLength);
            let value = iRegisters[register](steps * compositionFactor);
            traceValues[register][0] = rValues[register] = value;
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
            // get values of init registers for the current step
            for (let i = 0; i < iValues.length; i++) {
                iValues[i] = iRegisters[i](step * compositionFactor);
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
    function evaluateTracePolynomials(polynomials) {
        const domainSize = compositionDomain.length;
        const extensionFactor = domainSize / traceLength;
        const constraintCount = constraints.length;
        // make sure trace polynomials are valid
        validateTracePolynomials(polynomials, traceLength);
        // evaluate transition polynomials over composition domain
        const tEvaluations = f.evalPolysAtRoots(polynomials, compositionDomain);
        // initialize evaluation arrays
        const evaluations = new Array(constraintCount);
        for (let i = 0; i < constraintCount; i++) {
            evaluations[i] = new Array(domainSize);
        }
        const nfSteps = domainSize - extensionFactor;
        const rValues = new Array(stateWidth);
        const nValues = new Array(stateWidth);
        const kValues = new Array(kRegisters.length);
        const sValues = new Array(sRegisters.length);
        const pValues = new Array(pRegisters.length);
        const cValues = new Array(cRegisters.length);
        const iValues = new Array(iRegisters.length);
        // evaluate constraints for each position of the extended trace
        let qValues;
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
            // get values of init registers for the current step
            for (let i = 0; i < iValues.length; i++) {
                iValues[i] = iRegisters[i](position);
            }
            // populate qValues with results of constraint evaluations
            qValues = evaluateConstraints(rValues, nValues, kValues, sValues, pValues, cValues, iValues);
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
    function buildReadonlyRegisterEvaluators(specs, isSecret) {
        const registers = specs.map(s => {
            if (s.pattern === 'repeat') {
                // make sure the length of values is at least 4; this is needed for FFT interpolation
                if (s.values.length === 2) {
                    s.values = s.values.concat(s.values);
                }
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
                const traceValues = stretchRegisterValues(s.values, traceLength);
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
    function buildInputRegisterEvaluators(inputs, specs, isSecret) {
        const regSpecs = new Array(inputs.length);
        for (let i = 0; i < inputs.length; i++) {
            let binary = specs[i].binary;
            if (binary) {
                validateBinaryValues(inputs[i], isSecret, i);
            }
            regSpecs[i] = { values: inputs[i], pattern: specs[i].pattern, binary };
        }
        return buildReadonlyRegisterEvaluators(regSpecs, isSecret);
    }
    // CONTEXT OBJECT
    // --------------------------------------------------------------------------------------------
    return {
        field: f,
        traceLength: traceLength,
        extensionFactor: extensionFactor,
        rootOfUnity: rootOfUnity,
        stateWidth: stateWidth,
        constraintCount: constraints.length,
        secretInputCount: registerSpecs.s.length,
        publicInputCount: registerSpecs.p.length,
        executionDomain: executionDomain,
        evaluationDomain: evaluationDomain,
        compositionDomain: compositionDomain,
        generateExecutionTrace: generateExecutionTrace,
        evaluateTracePolynomials: evaluateTracePolynomials,
        secretRegisterTraces: sRegisterTraces
    };
}
exports.initProof = initProof;
// VERIFICATION OBJECT GENERATOR
// ================================================================================================
function initVerification(pInputs) {
    const traceLength = loopSpecs.baseCycleLength; // TODO
    validateStaticRegisterValues(traceLength);
    validateInputRegisterValues(pInputs, traceLength, 'public');
    const evaluationDomainSize = traceLength * extensionFactor;
    const rootOfUnity = f.getRootOfUnity(evaluationDomainSize);
    // build static, public, and control register evaluators
    const kRegisters = buildReadonlyRegisterEvaluators(registerSpecs.k);
    const pRegisters = buildInputRegisterEvaluators(pInputs, registerSpecs.p, false);
    const cRegisters = []; // TODO
    // CONSTRAINT EVALUATOR
    // --------------------------------------------------------------------------------------------
    function evaluateConstraintsAt(x, rValues, nValues, sValues) {
        // get values of readonly registers for the current position
        const kValues = new Array(kRegisters.length);
        for (let i = 0; i < kValues.length; i++) {
            kValues[i] = kRegisters[i](x);
        }
        // get values of public inputs for the current position
        const pValues = new Array(pRegisters.length);
        for (let i = 0; i < pValues.length; i++) {
            pValues[i] = pRegisters[i](x);
        }
        // get values of control for the current position
        const cValues = new Array(cRegisters.length);
        for (let i = 0; i < cValues.length; i++) {
            cValues[i] = cRegisters[i](x);
        }
        const iValues = []; // TODO
        // populate qValues with constraint evaluations
        const qValues = evaluateConstraints(rValues, nValues, kValues, sValues, pValues, cValues, iValues);
        return qValues;
    }
    // REGISTER EVALUATOR BUILDERS
    // --------------------------------------------------------------------------------------------
    function buildReadonlyRegisterEvaluators(specs) {
        let executionDomain;
        const registers = specs.map((s => {
            if (s.pattern === 'repeat') {
                // make sure the length of values is at least 4; this is needed for FFT interpolation
                if (s.values.length === 2) {
                    s.values = s.values.concat(s.values);
                }
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
    function buildInputRegisterEvaluators(inputs, specs, isSecret) {
        const regSpecs = new Array(inputs.length);
        for (let i = 0; i < inputs.length; i++) {
            let binary = specs[i].binary;
            if (binary) {
                validateBinaryValues(inputs[i], isSecret, i);
            }
            regSpecs[i] = { values: inputs[i], pattern: specs[i].pattern, binary };
        }
        return buildReadonlyRegisterEvaluators(regSpecs);
    }
    // CONTEXT OBJECT
    // --------------------------------------------------------------------------------------------
    return {
        field: f,
        traceLength: traceLength,
        extensionFactor: extensionFactor,
        rootOfUnity: rootOfUnity,
        stateWidth: stateWidth,
        constraintCount: constraints.length,
        secretInputCount: registerSpecs.s.length,
        publicInputCount: registerSpecs.p.length,
        evaluateConstraintsAt: evaluateConstraintsAt
    };
}
exports.initVerification = initVerification;
// HELPER FUNCTIONS
// ================================================================================================
function validateInitValues(initValues) {
    const traceTemplate = loopSpecs.traceTemplate;
    const traceShape = [initValues.length];
    const iRegisterValues = new Array(traceTemplate.length).fill([]);
    for (let value of initValues) {
        for (let i = 0; i < traceTemplate.length; i++) {
            let uv = unrollRegisterValues(value[i], i, traceTemplate[i], traceShape);
            iRegisterValues[i] = iRegisterValues[i].concat(uv);
        }
    }
    const cycleCount = traceShape.reduce((p, c) => p * c, 1);
    for (let i = 0; i < iRegisterValues.length; i++) {
        iRegisterValues[i] = stretchRegisterValues(iRegisterValues[i], cycleCount);
        iRegisterValues[i].push(iRegisterValues[i].shift());
    }
    const traceLength = cycleCount * loopSpecs.baseCycleLength;
    if (traceLength > maxTraceLength) {
        throw new Error(`total trace length cannot exceed ${maxTraceLength}`);
    }
    const iRegisterSpecs = iRegisterValues.map(v => {
        return { values: v, binary: false, pattern: 'spread' };
    });
    return { traceLength, traceShape, iRegisterSpecs };
}
exports.validateInitValues = validateInitValues;
function validateStaticRegisterValues(traceLength) {
    for (let i = 0; i < registerSpecs.k.length; i++) {
        if (traceLength % registerSpecs.k[i].values.length !== 0) {
            throw new Error(`invalid definition for static register $k${i}: number of values must be a divisor of ${traceLength}`);
        }
    }
}
exports.validateStaticRegisterValues = validateStaticRegisterValues;
function validateInputRegisterValues(inputs, traceLength, type) {
    if (!inputs)
        throw new TypeError(`${type} inputs are undefined`);
    if (!Array.isArray(inputs))
        throw new TypeError(`${type} inputs parameter must be an array`);
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
exports.validateInputRegisterValues = validateInputRegisterValues;
function validateTracePolynomials(trace, traceLength) {
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
exports.validateTracePolynomials = validateTracePolynomials;
function validateBinaryValues(values, isSecret, i) {
    for (let value of values) {
        if (value !== f.zero && value !== f.one) {
            let registerName = isSecret ? `$s${i}` : `$p${i}`;
            throw new Error(`Invalid definition for readonly register ${registerName}: the register can contain only binary values`);
        }
    }
}
exports.validateBinaryValues = validateBinaryValues;
function buildControlRegisterSpecs(traceShape, traceLength) {
    const masks = [];
    // derive input loop trace masks from trace shape
    let period = traceLength;
    let baseline = new Array(period / traceShape[0]);
    for (let i = 0; i < traceShape.length; i++) {
        period = period / traceShape[i];
        let mask = new Array(period - 1).fill(0);
        mask.push(1);
        masks[i] = new Array(baseline.length);
        for (let j = 0; j < baseline.length; j++) {
            masks[i][j] = mask[j % period] ^ baseline[j];
            baseline[j] = mask[j % period] | baseline[j];
        }
    }
    // combine input loop trace masks with segment loop trace masks
    for (let segmentMask of loopSpecs.segmentMasks) {
        let mask = segmentMask.slice(1);
        mask.push(0); // move the init step mask to the end
        masks.push(mask);
    }
    // transform masks into a set of static register values
    const values = [];
    const loopCount = Math.ceil(Math.log2(masks.length));
    for (let i = 0; i < loopCount * 2; i++) {
        values.push(new Array(baseline.length));
    }
    let p = 0;
    for (let mask of masks) {
        let key = p.toString(2).padStart(loopCount, '0');
        for (let i = 0; i < mask.length; i++) {
            for (let j = 0; j < loopCount; j++) {
                if (mask[i] === 1) {
                    let value = key.charAt(j) === '1' ? f.one : f.zero;
                    values[2 * j][i] = value;
                    values[2 * j + 1][i] = f.sub(f.one, value);
                }
            }
        }
        p++;
    }
    for (let i = 0; i < values.length; i++) {
        values[i] = removeRepeatingCycles(values[i]);
    }
    // transform values into register specs and return
    return values.map(v => ({ values: v, binary: true, pattern: 'repeat' }));
}
exports.buildControlRegisterSpecs = buildControlRegisterSpecs;
function stretchRegisterValues(values, traceLength) {
    const traceValues = new Array(traceLength);
    const stretchLength = traceLength / values.length;
    let start = 0;
    for (let i = 0; i < values.length; i++, start += stretchLength) {
        traceValues.fill(values[i], start, start + stretchLength);
    }
    return traceValues;
}
exports.stretchRegisterValues = stretchRegisterValues;
function unrollRegisterValues(value, register, depth, shape) {
    if (typeof value === 'bigint') {
        if (depth !== 0) {
            throw new Error(`values provided for register $i${register} do not match the expected template`);
        }
        return [value];
    }
    else {
        if (shape[depth] === undefined) {
            shape[depth] = value.length;
        }
        else {
            if (value.length !== shape[depth]) {
                throw new Error(`values provided for register $i${register} do not match the expected template`);
            }
        }
        let result = [];
        for (let i = 0; i < value.length; i++) {
            result = [...result, ...unrollRegisterValues(value[i], register, depth - 1, shape)];
        }
        return result;
    }
}
exports.unrollRegisterValues = unrollRegisterValues;
function removeRepeatingCycles(values) {
    const halfLength = values.length / 2;
    for (let i = 0; i < halfLength; i++) {
        if (values[i] !== values[i + halfLength]) {
            return values;
        }
    }
    return removeRepeatingCycles(values.slice(halfLength));
}
exports.removeRepeatingCycles = removeRepeatingCycles;
//# sourceMappingURL=JsModuleTemplate.js.map