// IMPORTS
// ================================================================================================
import { FiniteField, Vector } from "@guildofweavers/galois";
import { RepeatRegister } from './RepeatRegister';
import { SpreadRegister } from './SpreadRegister';
import { ProofContext, VerificationContext } from "../contexts";

// INTERFACES
// ================================================================================================
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

export interface ReadonlyRegister {
    getTraceValue(step: number): bigint;
    getEvaluation(position: number): bigint;
    getAllEvaluations(evaluationDomain: Vector): Vector;
}

export type ReadonlyRegisterEvaluator = (x: bigint) => bigint;

// PUBLIC FUNCTIONS
// ================================================================================================
export function buildReadonlyRegisters(specs: ReadonlyRegisterSpecs[], ctx: ProofContext): ReadonlyRegister[] {
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

export function buildInputRegisters(inputs: bigint[][], specs: InputRegisterSpecs[], isSecret: boolean, ctx: ProofContext): ReadonlyRegister[] {
    const regSpecs = new Array<ReadonlyRegisterSpecs>(inputs.length);
    for (let i = 0; i < inputs.length; i++) {
        let binary = specs[i].binary;
        if (binary) {
            validateBinaryValues(inputs[i], ctx.field, isSecret, i);
        }

        regSpecs[i] = { values: inputs[i], pattern: specs[i].pattern, binary };
    }
    return buildReadonlyRegisters(regSpecs, ctx);
}

// EVALUATOR BUILDERS
// ================================================================================================
export function buildReadonlyRegisterEvaluators(specs: ReadonlyRegisterSpecs[], ctx: VerificationContext): ReadonlyRegisterEvaluator[] {
    const registers: ReadonlyRegisterEvaluator[] = [];

    for (let s of specs) {
        if (s.pattern === 'repeat') {
            registers.push(RepeatRegister.buildEvaluator(s.values, ctx));
        }
        else if (s.pattern === 'spread') {
            registers.push(SpreadRegister.buildEvaluator(s.values, ctx));
        }
        else {
            throw new TypeError(`Invalid value pattern '${s.pattern}'`);
        }
    }

    return registers;
}

export function buildInputRegisterEvaluators(inputs: bigint[][], specs: InputRegisterSpecs[], isSecret: boolean, ctx: VerificationContext): ReadonlyRegisterEvaluator[] {
    const regSpecs = new Array<ReadonlyRegisterSpecs>(inputs.length);
    for (let i = 0; i < inputs.length; i++) {
        let binary = specs[i].binary;
        if (binary) {
            validateBinaryValues(inputs[i], ctx.field, isSecret, i);
        }

        regSpecs[i] = { values: inputs[i], pattern: specs[i].pattern, binary };
    }
    return buildReadonlyRegisterEvaluators(regSpecs, ctx);
}

// HELPER FUNCTIONS
// ================================================================================================
function validateBinaryValues(values: bigint[], field: FiniteField, isSecret: boolean, i: number): void {
    for (let value of values) {
        if (value !== field.zero && value !== field.one) {
            let registerName = isSecret ? `$s${i}` : `$p${i}`;
            throw new Error(`Invalid definition for readonly register ${registerName}: the register can contain only binary values`);
        }
    }
}