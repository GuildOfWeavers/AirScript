"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// MODULE VARIABLE PLACEHOLDERS
// ================================================================================================
const f = undefined;
const stateWidth = 0;
const loops = { registerDepths: [], baseCycleMasks: [], baseCycleLength: 0 };
const constraints = [];
const inputRegisters = [];
const staticRegisters = [];
const compositionFactor = 0;
const extensionFactor = 0;
const maxTraceLength = 0;
// GENERATED FUNCTION PLACEHOLDERS
// ================================================================================================
const applyTransition = function () { return []; };
const evaluateConstraints = function () { return []; };
// PROOF OBJECT GENERATOR
// ================================================================================================
function initProof(inputs) {
    // validate inputs
    const { traceLength, traceShape, iRegisterSpecs } = processInputs(inputs);
    validateStaticRegisterValues(traceLength);
    const cRegisterSpecs = buildControlRegisterSpecs(traceShape, traceLength);
    // build evaluation domain
    const evaluationDomainSize = traceLength * extensionFactor;
    const rootOfUnity = f.getRootOfUnity(evaluationDomainSize);
    const evaluationDomain = f.getPowerSeries(rootOfUnity, evaluationDomainSize);
    // build execution and composition domains by plucking values from evaluation domain
    const eSkip = extensionFactor;
    const executionDomain = f.pluckVector(evaluationDomain, eSkip, traceLength);
    const cSkip = extensionFactor / compositionFactor;
    const compositionDomainSize = traceLength * compositionFactor;
    const compositionDomain = f.pluckVector(evaluationDomain, cSkip, compositionDomainSize);
    // create a variable to hold secret register traces
    const secretRegisterTraces = [];
    // build readonly registers
    const kRegisters = buildReadonlyRegisterEvaluators(staticRegisters);
    const cRegisters = buildReadonlyRegisterEvaluators(cRegisterSpecs);
    const iRegisters = buildReadonlyRegisterEvaluators(iRegisterSpecs);
    // EXECUTION TRACE GENERATOR
    // --------------------------------------------------------------------------------------------
    function generateExecutionTrace() {
        const steps = traceLength - 1;
        const kValues = new Array(kRegisters.length).fill(f.zero);
        const iValues = new Array(iRegisters.length).fill(f.zero);
        const cValues = new Array(2 ** cRegisters.length).fill(f.zero);
        // build the first row of the execution trace by execution transition function at the last step
        let rValues = new Array(stateWidth).fill(f.zero);
        populateControlValues(cValues, cRegisters, steps * compositionFactor);
        for (let i = 0; i < iValues.length; i++) {
            iValues[i] = iRegisters[i](steps * compositionFactor);
        }
        let nValues = applyTransition(rValues, kValues, iValues, cValues);
        // initialize execution trace and copy over the first row
        const traceValues = new Array(stateWidth);
        for (let register = 0; register < traceValues.length; register++) {
            traceValues[register] = new Array(traceLength);
            traceValues[register][0] = nValues[register];
            rValues[register] = nValues[register];
        }
        // apply transition function for each step
        let step = 0;
        while (step < steps) {
            let position = step * compositionFactor;
            // get values of static registers for the current step
            for (let i = 0; i < kValues.length; i++) {
                kValues[i] = kRegisters[i](position);
            }
            // get values of input registers for the current step
            for (let i = 0; i < iValues.length; i++) {
                iValues[i] = iRegisters[i](position);
            }
            // get values of control registers for the current step
            populateControlValues(cValues, cRegisters, position);
            // populate nValues with the next computation state
            nValues = applyTransition(rValues, kValues, iValues, cValues);
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
        const nfSteps = domainSize - compositionFactor;
        const rValues = new Array(stateWidth);
        const nValues = new Array(stateWidth);
        const kValues = new Array(kRegisters.length);
        const iValues = new Array(iRegisters.length);
        const cValues = new Array(2 ** cRegisters.length);
        // evaluate constraints for each position of the extended trace
        let qValues;
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
            // get values of init registers for the current step
            for (let i = 0; i < iValues.length; i++) {
                iValues[i] = iRegisters[i](position);
            }
            // get values of control registers for the current step
            populateControlValues(cValues, cRegisters, position);
            // populate qValues with results of constraint evaluations
            qValues = evaluateConstraints(rValues, nValues, kValues, iValues, cValues);
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
    function buildReadonlyRegisterEvaluators(specs) {
        const registers = specs.map(r => {
            if (r.pattern === 'repeat') {
                // make sure the length of values is at least 4; this is needed for FFT interpolation
                if (r.values.length === 2) {
                    r.values = r.values.concat(r.values);
                }
                // build the polynomial describing cyclic values
                const skip = evaluationDomainSize / r.values.length;
                const ys = f.newVectorFrom(r.values);
                const xs = f.pluckVector(evaluationDomain, skip, ys.length);
                const poly = f.interpolateRoots(xs, ys);
                // evaluate the polynomial over a subset of composition domain
                const length2 = r.values.length * extensionFactor;
                const skip2 = evaluationDomainSize / length2;
                const xs2 = f.pluckVector(evaluationDomain, skip2, length2);
                const evaluations = f.evalPolyAtRoots(poly, xs2);
                // if the register is secret, build its trace over evaluation domain
                if (r.secret) {
                    // figure out how many times the evaluations vector needs to be doubled to reach domain size
                    const i = Math.log2(evaluationDomain.length / evaluations.length);
                    secretRegisterTraces.push((i > 0) ? f.duplicateVector(evaluations, i) : evaluations);
                }
                // return evaluator function
                const skip3 = evaluationDomainSize / compositionDomainSize;
                return (position) => evaluations.getValue((position * skip3) % evaluations.length);
            }
            else if (r.pattern === 'spread') {
                // create trace mask
                const traceValues = stretchRegisterValues(r.values, traceLength);
                // build the polynomial describing spread values
                const trace = f.newVectorFrom(traceValues);
                const poly = f.interpolateRoots(executionDomain, trace);
                // evaluate the polynomial over composition domain
                const evaluations = f.evalPolyAtRoots(poly, compositionDomain);
                // if the register is secret, build its trace over evaluation domain
                if (r.secret) {
                    secretRegisterTraces.push(f.evalPolyAtRoots(poly, evaluationDomain));
                }
                // return evaluator function
                return (position) => evaluations.getValue(position % evaluations.length);
            }
            else {
                throw new TypeError(`Invalid value pattern '${r.pattern}'`);
            }
        });
        return registers;
    }
    // CONTEXT OBJECT
    // --------------------------------------------------------------------------------------------
    return {
        field: f,
        traceShape: traceShape,
        traceLength: traceLength,
        extensionFactor: extensionFactor,
        rootOfUnity: rootOfUnity,
        stateWidth: stateWidth,
        constraintCount: constraints.length,
        inputRegisterCount: inputRegisters.length,
        staticRegisterCount: staticRegisters.length,
        executionDomain: executionDomain,
        evaluationDomain: evaluationDomain,
        compositionDomain: compositionDomain,
        generateExecutionTrace: generateExecutionTrace,
        evaluateTracePolynomials: evaluateTracePolynomials,
        secretRegisterTraces: secretRegisterTraces
    };
}
exports.initProof = initProof;
// VERIFICATION OBJECT GENERATOR
// ================================================================================================
function initVerification(traceShape, pInputs) {
    const traceLength = validateTraceShape(traceShape);
    processPublicInputs(pInputs, traceLength);
    validateStaticRegisterValues(traceLength);
    const cRegisterSpecs = buildControlRegisterSpecs(traceShape, traceLength);
    const evaluationDomainSize = traceLength * extensionFactor;
    const rootOfUnity = f.getRootOfUnity(evaluationDomainSize);
    // build static, public, and control register evaluators
    const kRegisters = buildReadonlyRegisterEvaluators(staticRegisters);
    const cRegisters = buildReadonlyRegisterEvaluators(cRegisterSpecs);
    const iRegistersOffset = 0; // TODO: registerSpecs.secretRegisters.length;
    // CONSTRAINT EVALUATOR
    // --------------------------------------------------------------------------------------------
    function evaluateConstraintsAt(x, rValues, nValues, hValues) {
        // get values of readonly registers for the current position
        const kValues = new Array(kRegisters.length);
        for (let i = 0; i < kValues.length; i++) {
            kValues[i] = kRegisters[i](x);
        }
        // get values of control for the current position
        const cValues = new Array(2 ** cRegisters.length);
        populateControlValues(cValues, cRegisters, x);
        // split hidden values into secret and init register values
        const iValues = hValues.slice(iRegistersOffset); // TODO: integrate public inputs
        // populate qValues with constraint evaluations
        const qValues = evaluateConstraints(rValues, nValues, kValues, iValues, cValues);
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
    // CONTEXT OBJECT
    // --------------------------------------------------------------------------------------------
    return {
        field: f,
        traceShape: traceShape,
        traceLength: traceLength,
        extensionFactor: extensionFactor,
        rootOfUnity: rootOfUnity,
        stateWidth: stateWidth,
        constraintCount: constraints.length,
        inputRegisterCount: inputRegisters.length,
        staticRegisterCount: staticRegisters.length,
        evaluateConstraintsAt: evaluateConstraintsAt
    };
}
exports.initVerification = initVerification;
// HELPER FUNCTIONS
// ================================================================================================
function processInputs(inputs) {
    // TODO: process all types of inputs (repeat, spread, etc.)
    const traceShape = [1];
    const iRegisterValues = new Array(inputRegisters.length);
    for (let i = 0; i < inputRegisters.length; i++) {
        let register = inputRegisters[i];
        let values = unrollRegisterValues(inputs[i], register.name, register.rank, traceShape);
        iRegisterValues[i] = values;
    }
    const cycleCount = traceShape.reduce((p, c) => p * c, 1);
    for (let i = 0; i < iRegisterValues.length; i++) {
        iRegisterValues[i] = stretchRegisterValues(iRegisterValues[i], cycleCount);
        iRegisterValues[i].push(iRegisterValues[i].shift());
    }
    const traceLength = cycleCount * loops.baseCycleLength;
    if (traceLength > maxTraceLength) {
        throw new Error(`total trace length cannot exceed ${maxTraceLength}`);
    }
    const iRegisterSpecs = iRegisterValues.map((values, i) => {
        let register = inputRegisters[i]; // TODO
        return { name: register.name, values, binary: false, pattern: 'spread', secret: true };
    });
    return { traceLength, traceShape, iRegisterSpecs };
}
exports.processInputs = processInputs;
function processPublicInputs(inputs, traceLength) {
    if (!inputs)
        throw new TypeError(`public inputs are undefined`);
    if (!Array.isArray(inputs))
        throw new TypeError(`public inputs parameter must be an array`);
    const registers = inputRegisters.filter(register => !register.secret);
    const expectedInputCount = 0; // TODO: type === 'public' ? registerSpecs.publicRegisters.length : registerSpecs.secretRegisters.length;
    if (inputs.length !== expectedInputCount) {
        throw new Error(`public inputs array must contain exactly ${expectedInputCount} elements`);
    }
    for (let i = 0; i < expectedInputCount; i++) {
        let input = inputs[i];
        if (!Array.isArray(input)) {
            throw new TypeError(`public input ${i} is invalid: an input must contain an array of values`);
        }
        if (traceLength % input.length !== 0) {
            throw new Error(`public input ${i} is invalid: number of values must be a divisor of ${traceLength}`);
        }
        for (let j = 0; j < input.length; j++) {
            if (typeof input[j] !== 'bigint') {
                throw new TypeError(`public input ${i} is invalid: value '${input[j]}' is not a BigInt`);
            }
        }
    }
}
exports.processPublicInputs = processPublicInputs;
function validateTraceShape(traceShape) {
    if (traceShape === undefined)
        throw new Error('trace shape was not provided');
    if (!Array.isArray(traceShape))
        throw new Error('trace shape must be an array');
    if (traceShape.length === 0)
        throw new Error('trace shape array must contain at least one element');
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
exports.validateTraceShape = validateTraceShape;
function validateStaticRegisterValues(traceLength) {
    for (let i = 0; i < staticRegisters.length; i++) {
        if (traceLength % staticRegisters[i].values.length !== 0) {
            throw new Error(`invalid definition for static register $k${i}: number of values must be a divisor of ${traceLength}`);
        }
    }
}
exports.validateStaticRegisterValues = validateStaticRegisterValues;
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
    for (let cycleMask of loops.baseCycleMasks) {
        // move the init step mask to the end
        let mask = cycleMask.slice(1);
        mask.push(0);
        // make sure all masks have the same length
        while (mask.length < baseline.length) {
            mask = mask.concat(mask);
        }
        masks.push(mask);
    }
    // transform masks into a set of static register values
    const values = [];
    const loopCount = Math.ceil(Math.log2(masks.length));
    for (let i = 0; i < loopCount; i++) {
        values.push(new Array(baseline.length));
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
    return values.map((values, i) => {
        return { name: `c${i}`, values, binary: true, pattern: 'repeat', secret: false };
    });
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
        if (depth !== 0)
            throw new Error(`values provided for register ${register} do not match the expected signature`);
        return [value];
    }
    else {
        if (depth === 0)
            throw new Error(`values provided for register ${register} do not match the expected signature`);
        if (!Array.isArray(value))
            throw new Error(`value provided for register ${register} at depth ${depth} is invalid`);
        else if (value.length === 0)
            throw new Error(`number of values for register ${register} at depth ${depth} must be greater than 0`);
        else if (!isPowerOf2(value.length))
            throw new Error(`number of values for register ${register} at depth ${depth} must be a power of 2`);
        if (shape[depth] === undefined) {
            shape[depth] = value.length;
        }
        else if (value.length !== shape[depth]) {
            throw new Error(`values provided for register $i${register} do not match the expected signature`);
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
function populateControlValues(cValues, cRegisters, position) {
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
exports.populateControlValues = populateControlValues;
function isPowerOf2(value) {
    return (value !== 0) && (value & (value - 1)) === 0;
}
exports.isPowerOf2 = isPowerOf2;
//# sourceMappingURL=JsModuleTemplate.js.map