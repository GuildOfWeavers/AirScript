// IMPORTS
// ================================================================================================
import { FiniteField } from "@guildofweavers/galois";
import { AirObject as IAirObject, ConstraintSpecs } from "@guildofweavers/air-script";
import { ProofContext, VerificationContext } from "./contexts";
import { InputRegisterSpecs, ReadonlyRegisterSpecs } from './registers';
import { isPowerOf2 } from "./utils";

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

    readonly applyTransition    : TransitionFunction;
    readonly evaluateConstraints: ConstraintEvaluator;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(config: AirConfig) {
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
    createContext(pInputs: bigint[][], extensionFactor: number): VerificationContext;
    createContext(pInputs: bigint[][], sInputs: bigint[][], extensionFactor: number): ProofContext;
    createContext(pInputs: bigint[][], sInputsOrExtensionFactor: bigint[][] | number, extensionFactor?: number): VerificationContext | ProofContext {

        const traceLength = this.steps;

        if (typeof sInputsOrExtensionFactor === 'number') {
            validateExtensionFactor(sInputsOrExtensionFactor, this.maxConstraintDegree);
            validatePublicInputs(pInputs, traceLength, this.publicInputCount);
            return new VerificationContext(this, pInputs, sInputsOrExtensionFactor);
        }
        else {
            validateExtensionFactor(extensionFactor!, this.maxConstraintDegree);
            validatePublicInputs(pInputs, traceLength, this.publicInputCount);
            validateSecretInputs(sInputsOrExtensionFactor, traceLength, this.secretInputCount);
            return new ProofContext(this, pInputs, sInputsOrExtensionFactor, extensionFactor!);
        }
    }
}

// VALIDATORS
// ================================================================================================
function validateExtensionFactor(extensionFactor: number, maxConstraintDegree: number) {
    if (!Number.isInteger(extensionFactor)) throw new TypeError('Extension factor must be an integer');
    if (!isPowerOf2(extensionFactor)) throw new Error('Extension factor must be a power of 2');
    if (extensionFactor < maxConstraintDegree) {
        throw new Error(`Extension factor must be greater than max constraint degree`);
    }
}

function validatePublicInputs(inputs: bigint[][], traceLength: number, expectedInputCount: number) {
    if (!inputs) throw new TypeError('Public inputs are undefined');
    if (!Array.isArray(inputs)) throw new TypeError('Public inputs parameter must be an array');
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

function validateSecretInputs(inputs: bigint[][], traceLength: number, expectedInputCount: number) {
    if (!inputs) throw new TypeError('Secret inputs are undefined');
    if (!Array.isArray(inputs)) throw new TypeError('Secret inputs parameter must be an array');
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