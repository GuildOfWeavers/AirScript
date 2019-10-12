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

        /** Maximum number of mutable registers; defaults to 64 */
        maxMutableRegisters: number;

        /** Maximum number of all readonly registers; defaults to 64 */
        maxReadonlyRegisters: number;

        /** Maximum number of transition constraints; defaults to 1024 */
        maxConstraintCount: number;

        /** Highest allowed degree of transition constraints; defaults to 16 */
        maxConstraintDegree: number;
    }

    export interface AirModule {

        readonly name                   : string;
        readonly field                  : FiniteField;
        readonly stateWidth             : number;
        readonly iRegisterCount         : number;
        readonly pRegisterCount         : number;
        readonly sRegisterCount         : number;
        readonly kRegisterCount         : number;
        readonly constraints            : ConstraintSpecs[];
        readonly maxConstraintDegree    : number;
        readonly extensionFactor        : number;

        /**
         * Creates proof object for the provided input values
         * @param inputs values used to initialized $i registers
         * @param auxPublicInputs values used to initialize $p registers
         * @param auxSecretInputs values used to initialize $s registers
         */
        initProof(inputs: any[], auxPublicInputs: bigint[][], auxSecretInputs: bigint[][]): ProofObject;

        /**
         * Creates verification object for the specified trace shape and public inputs
         * @param traceShape number of cycles of each depth of input loop
         * @param auxPublicInputs values used to initialize $p registers
         */
        initVerification(traceShape: number[], auxPublicInputs: bigint[][]): VerificationObject;
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
        readonly iRegisterCount     : number;
        readonly pRegisterCount     : number;
        readonly sRegisterCount     : number;
        readonly kRegisterCount     : number;
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

        /** Values of hidden registers evaluated over execution domain */
        readonly hiddenRegisterTraces: Vector[];

        generateExecutionTrace(): Matrix;
        evaluateTracePolynomials(polynomials: Matrix): Matrix;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    export function parseScript(script: string, options?: ScriptOptions): AirModule;

    // INTERNAL INTERFACES
    // --------------------------------------------------------------------------------------------
    export type ReadonlyRegisterEvaluator<T extends bigint | number> = (x: T) => bigint;

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

    export interface ReadonlyRegisterGroup {
        staticRegisters : ReadonlyRegisterSpecs[];
        secretRegisters : InputRegisterSpecs[];
        publicRegisters : InputRegisterSpecs[];
    }

    export interface InputBlockDescriptor {
        registerDepths  : number[];
        baseCycleMasks  : number[][];
        baseCycleLength : number;
    }

    export interface TransitionFunction {
        /**
         * @param r Array with values of mutable registers at the current step
         * @param k Array with values of static registers at the current step
         * @param s Array with values of secret inputs at the current step
         * @param p Array with values of public inputs at the current step
         * @param c Array with values of control registers at the current step
         * @param i Array with values of init registers at the current step
         * @returns Array to hold values of mutable registers for the next step
         */
        (r: bigint[], k: bigint[], s: bigint[], p: bigint[], c: bigint[], i: bigint[]): bigint[];
    }
    
    export interface ConstraintEvaluator {
        /**
         * @param r Array with values of mutable registers at the current step
         * @param n Array with values of mutable registers at the next step
         * @param k Array with values of static registers at the current step
         * @param s Array with values of secret inputs at the current step
         * @param p Array with values of public inputs at the current step
         * @param c Array with values of control registers at the current step
         * @param i Array with values of init registers at the current step
         * @readonly Array to hold values of constraint evaluated at the current step
         */
        (r: bigint[], n: bigint[], k: bigint[], s: bigint[], p: bigint[], c: bigint[], i: bigint[]): bigint[];
    }
}