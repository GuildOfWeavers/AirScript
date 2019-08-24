"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contexts_1 = require("./contexts");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class AirObject {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(config) {
        this.name = config.name;
        this.field = config.field;
        this.steps = config.steps;
        this.stateWidth = config.stateWidth;
        this.secretInputs = config.secretInputs;
        this.publicInputs = config.publicInputs;
        this.staticRegisters = config.staticRegisters;
        this.constraints = config.constraints;
        this.applyTransition = config.transitionFunction;
        this.evaluateConstraints = config.constraintEvaluator;
    }
    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get publicInputCount() {
        return this.publicInputs.length;
    }
    get secretInputCount() {
        return this.secretInputs.length;
    }
    get maxConstraintDegree() {
        let result = 0;
        for (let constraint of this.constraints) {
            if (constraint.degree > result) {
                result = constraint.degree;
            }
        }
        return result;
    }
    get constraintCount() {
        return this.constraints.length;
    }
    get hasSpreadRegisters() {
        for (let specs of this.secretInputs) {
            if (specs.pattern === 'spread')
                return true;
        }
        ;
        for (let specs of this.publicInputs) {
            if (specs.pattern === 'spread')
                return true;
        }
        ;
        for (let specs of this.staticRegisters) {
            if (specs.pattern === 'spread')
                return true;
        }
        ;
        return false;
    }
    createContext(pInputs, sInputsOrExtensionFactor, extensionFactor) {
        const traceLength = this.steps;
        if (typeof sInputsOrExtensionFactor === 'number') {
            validateExtensionFactor(sInputsOrExtensionFactor, this.maxConstraintDegree);
            validatePublicInputs(pInputs, traceLength, this.publicInputCount);
            return new contexts_1.VerificationContext(this, pInputs, sInputsOrExtensionFactor);
        }
        else {
            validateExtensionFactor(extensionFactor, this.maxConstraintDegree);
            validatePublicInputs(pInputs, traceLength, this.publicInputCount);
            validateSecretInputs(sInputsOrExtensionFactor, traceLength, this.secretInputCount);
            return new contexts_1.ProofContext(this, pInputs, sInputsOrExtensionFactor, extensionFactor);
        }
    }
}
exports.AirObject = AirObject;
// VALIDATORS
// ================================================================================================
function validateExtensionFactor(extensionFactor, maxConstraintDegree) {
    if (!Number.isInteger(extensionFactor))
        throw new TypeError('Extension factor must be an integer');
    if (!utils_1.isPowerOf2(extensionFactor))
        throw new Error('Extension factor must be a power of 2');
    if (extensionFactor < maxConstraintDegree) {
        throw new Error(`Extension factor must be greater than max constraint degree`);
    }
}
function validatePublicInputs(inputs, traceLength, expectedInputCount) {
    if (!inputs)
        throw new TypeError('Public inputs are undefined');
    if (!Array.isArray(inputs))
        throw new TypeError('Public inputs parameter must be an array');
    if (inputs.length !== expectedInputCount) {
        throw new Error(`Public inputs array must contain exactly ${expectedInputCount} elements`);
    }
    for (let i = 0; i < expectedInputCount; i++) {
        let input = inputs[i];
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
}
function validateSecretInputs(inputs, traceLength, expectedInputCount) {
    if (!inputs)
        throw new TypeError('Secret inputs are undefined');
    if (!Array.isArray(inputs))
        throw new TypeError('Secret inputs parameter must be an array');
    if (inputs.length !== expectedInputCount) {
        throw new Error(`Secret inputs array must contain exactly ${expectedInputCount} elements`);
    }
    for (let i = 0; i < expectedInputCount; i++) {
        let input = inputs[i];
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
function validateExtendedTrace(trace, stateWidth, domainSize) {
    if (!trace)
        throw new TypeError('Extended trace is undefined');
    if (!trace.rowCount || !trace.colCount)
        throw new TypeError('Evaluation trace parameter must be a matrix'); // TODO: improve
    if (trace.rowCount !== stateWidth) {
        throw new Error(`Extended trace matrix must contain exactly ${stateWidth} rows`);
    }
    if (trace.colCount !== domainSize) {
        throw new Error(`Extended trace matrix must contain exactly ${domainSize} columns`);
    }
}
//# sourceMappingURL=AirObject.js.map