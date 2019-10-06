declare module '@guildofweavers/air-script' {

    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------
    import { FiniteField, Vector, Matrix, WasmOptions } from '@guildofweavers/galois';
    export { FiniteField, Vector, Matrix, WasmOptions } from '@guildofweavers/galois';

    // INTERFACES
    // --------------------------------------------------------------------------------------------
    export interface ScriptOptions {
        limits?         : Partial<StarkLimits>;
        wasmOptions?    : Partial<WasmOptions>; // TODO: add boolean?
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
        readonly publicInputCount       : number;
        readonly secretInputCount       : number;
        readonly constraints            : ConstraintSpecs[];
        readonly maxConstraintDegree    : number;

        /** Creates proof object for the provided public inputs, secret inputs, and init values */
        initProof(publicInputs: bigint[][], secretInputs: bigint[][], initValues: bigint[]): ProofObject;

        /** Creates verification object for the provided public inputs */
        initVerification(publicInputs: bigint[][]): VerificationObject;
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
    export interface EvaluationContext {
        readonly field              : FiniteField
        readonly traceLength        : number;
        readonly extensionFactor    : number;
        readonly rootOfUnity        : bigint;
        readonly stateWidth         : number;
        readonly constraintCount    : number;
        readonly secretInputCount   : number;
        readonly publicInputCount   : number;
    }

    export interface VerificationObject extends EvaluationContext {
        /**
         * Evaluates transition constraints at the specified point
         * @param x Point in the evaluation domain at which to evaluate constraints
         * @param rValues Values of mutable registers at the current step
         * @param nValues Values of mutable registers at the next step
         * @param sValues Values of secret registers at the current step
         */
        evaluateConstraintsAt(x: bigint, rValues: bigint[], nValues: bigint[], sValues: bigint[]): bigint[];
    }

    export interface ProofObject extends EvaluationContext {
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