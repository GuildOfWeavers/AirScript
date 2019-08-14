declare module '@guildofweavers/air-script' {

    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------
    import { FiniteField, Vector, Matrix, WasmOptions } from '@guildofweavers/galois';
    export { FiniteField, Vector, Matrix, WasmOptions } from '@guildofweavers/galois';

    // INTERFACES
    // --------------------------------------------------------------------------------------------
    export interface StarkLimits {
        maxSteps                : number;
        maxMutableRegisters     : number;
        maxReadonlyRegisters    : number;
        maxConstraintCount      : number;
        maxConstraintDegree     : number;
        maxExtensionFactor      : number;
    }

    export interface ScriptOptions {
        extensionFactor         : number;
        wasmOptions             : Partial<WasmOptions> | null;
    }

    export interface AirObject {

        readonly name                   : string;
        readonly field                  : FiniteField;
        readonly stateWidth             : number;
        readonly publicInputCount       : number;
        readonly secretInputCount       : number;
        readonly constraints            : ConstraintSpecs[];
        readonly maxConstraintDegree    : number;
        readonly extensionFactor        : number;

        createContext(publicInputs: bigint[][]): VerificationContext;
        createContext(publicInputs: bigint[][], secretInputs: bigint[][]): ProofContext;

        generateExecutionTrace(initValues: bigint[], ctx: ProofContext): Matrix;
        evaluateExtendedTrace(extendedTrace: Matrix, ctx: ProofContext): Matrix;
        evaluateConstraintsAt(x: bigint, rValues: bigint[], nValues: bigint[], sValues: bigint[], ctx: VerificationContext): bigint[];
    }

    export class AirScriptError {
        readonly errors: any[];
        constructor(errors: any[]);
    }

    // CONTEXTS
    // --------------------------------------------------------------------------------------------
    export interface EvaluationContext {
        readonly field              : FiniteField
        readonly traceLength        : number;
        readonly extensionFactor    : number;
        readonly rootOfUnity        : bigint;
        readonly executionDomain?   : Vector;
        readonly evaluationDomain?  : Vector;
    }

    export interface VerificationContext extends EvaluationContext {
        readonly stateWidth         : number;
        readonly constraintCount    : number;
        readonly secretInputCount   : number;
        readonly publicInputCount   : number;
        readonly kRegisters         : ReadonlyRegister[];
        readonly pRegisters         : ReadonlyRegister[];
    }

    export interface ProofContext extends VerificationContext {
        readonly sRegisters         : ReadonlyRegister[];
        readonly sEvaluations       : Vector[];
        readonly executionDomain    : Vector;
        readonly evaluationDomain   : Vector;
    }

    export interface ReadonlyRegister {
        getTraceValue(step: number): bigint;
        getEvaluation(position: number): bigint;
        getEvaluationAt(x: bigint): bigint;
        getAllEvaluations(): Vector;
    }

    export interface ConstraintSpecs {
        degree  : number;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    export function parseScript(script: string, limits?: Partial<StarkLimits>, options?: Partial<ScriptOptions>): AirObject;
}