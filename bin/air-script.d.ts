declare module '@guildofweavers/air-script' {

    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------
    import { FiniteField, Vector, Matrix, WasmOptions } from '@guildofweavers/galois';
    export { FiniteField, Vector, Matrix, WasmOptions } from '@guildofweavers/galois';

    // INTERFACES
    // --------------------------------------------------------------------------------------------
    export interface ScriptOptions {
        limits?         : Partial<StarkLimits>;
        wasmOptions?    : Partial<WasmOptions> | boolean;
        extensionFactor?: number;
    }

    export interface StarkLimits {

        /** Maximum number of steps in an execution trace; defaults to 2^20 */
        maxTraceLength: number;

        /** Maximum number of input registers; defaults to 32 */
        maxInputRegisters: number;

        /** Maximum number of state registers; defaults to 64 */
        maxStateRegisters: number;

        /** Maximum number of all static registers; defaults to 64 */
        maxStaticRegisters: number;

        /** Maximum number of transition constraints; defaults to 1024 */
        maxConstraintCount: number;

        /** Highest allowed degree of transition constraints; defaults to 16 */
        maxConstraintDegree: number;
    }

    export interface AirModule {

        readonly name                   : string;
        readonly field                  : FiniteField;
        readonly stateWidth             : number;
        readonly inputRegisters         : InputRegisterSpecs[];
        readonly staticRegisters        : StaticRegisterSpecs[];
        readonly constraints            : ConstraintSpecs[];
        readonly maxConstraintDegree    : number;

        /**
         * Creates proof object for the provided input values
         * @param inputs values for initializing input registers
         */
        initProof(inputs: any[]): ProofObject;

        /**
         * Creates verification object for the specified trace shape and public inputs
         * @param traceShape number of cycles of each depth of input loop
         * @param publicInputs values for initialize public input registers
         */
        initVerification(traceShape: number[], publicInputs: any[]): VerificationObject;
    }

    export class AirScriptError {
        readonly errors: any[];
        constructor(errors: any[]);
    }

    export interface ConstraintSpecs {
        degree  : number;
    }

    // CONTEXTS
    // --------------------------------------------------------------------------------------------
    export interface AirObject {
        readonly field              : FiniteField;
        readonly traceShape         : number[];
        readonly traceLength        : number;
        readonly extensionFactor    : number;
        readonly rootOfUnity        : bigint;
        readonly stateWidth         : number;
        readonly constraintCount    : number;
        readonly inputRegisterCount : number;
        readonly staticRegisterCount: number;
    }

    export interface VerificationObject extends AirObject {
        /**
         * Evaluates transition constraints at the specified point
         * @param x Point in the evaluation domain at which to evaluate constraints
         * @param rValues Values of mutable registers at the current step
         * @param nValues Values of mutable registers at the next step
         * @param hValues Values of hidden registers at the current step
         */
        evaluateConstraintsAt(x: bigint, rValues: bigint[], nValues: bigint[], hValues: bigint[]): bigint[];
    }

    export interface ProofObject extends AirObject {
        /** Domain of the execution trace */
        readonly executionDomain: Vector;

        /** Domain of the low-degree extended execution trace */
        readonly evaluationDomain: Vector;

        /** Domain of the low-degree extended composition polynomial */
        readonly compositionDomain: Vector;

        /** Values of secret registers evaluated over execution domain */
        readonly secretRegisterTraces: Vector[];

        generateExecutionTrace(): Matrix;
        evaluateTracePolynomials(polynomials: Matrix): Matrix;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    export function instantiate(path: string, options?: ScriptOptions): Promise<AirModule>;
    export function instantiate(script: Buffer, options?: ScriptOptions): Promise<AirModule>;

    // INTERNAL INTERFACES
    // --------------------------------------------------------------------------------------------
    export type ReadonlyRegisterEvaluator<T extends bigint | number> = (x: T) => bigint;

    export interface ReadonlyRegisterSpecs {
        name    : string;
        pattern : 'repeat' | 'spread';
        secret  : boolean;
        binary  : boolean;
        values  : bigint[];
    }

    export interface StaticRegisterSpecs extends ReadonlyRegisterSpecs {
        index   : number;
        secret  : false;
    }

    export interface InputRegisterSpecs {
        name    : string;
        index   : number;
        pattern : 'expand' | 'repeat' | 'spread';
        binary  : boolean;
        rank    : number;
        secret  : boolean;
    }    

    export interface InputBlockDescriptor {
        registerDepths  : number[];
        baseCycleMasks  : number[][];
        baseCycleLength : number;
    }

    export interface TransitionFunction {
        /**
         * @param r Array with values of state registers at the current step
         * @param k Array with values of static registers at the current step
         * @param i Array with values of input registers at the current step
         * @param c Array with values of control registers at the current step
         * @returns Array to hold values of mutable registers for the next step
         */
        (r: bigint[], k: bigint[], i: bigint[], c: bigint[]): bigint[];
    }
    
    export interface ConstraintEvaluator {
        /**
         * @param r Array with values of state registers at the current step
         * @param n Array with values of state registers at the next step
         * @param k Array with values of static registers at the current step
         * @param i Array with values of input registers at the current step
         * @param c Array with values of control registers at the current step
         * @readonly Array to hold values of constraint evaluated at the current step
         */
        (r: bigint[], n: bigint[], k: bigint[], i: bigint[], c: bigint[]): bigint[];
    }
}