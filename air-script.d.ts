declare module '@guildofweavers/air-script' {

    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------
    import { FiniteField, Vector, Matrix, WasmOptions } from '@guildofweavers/galois';
    export { FiniteField, Vector, Matrix, WasmOptions } from '@guildofweavers/galois';

    // INTERFACES
    // --------------------------------------------------------------------------------------------
    export interface StarkLimits {

        /** Maximum number of steps in an execution trace; defaults to 2^20 */
        maxSteps: number;

        /** Maximum number of mutable registers; defaults to 64 */
        maxMutableRegisters: number;

        /** Maximum number of all readonly registers; defaults to 64 */
        maxReadonlyRegisters: number;

        /** Maximum number of transition constraints; defaults to 1024 */
        maxConstraintCount: number;

        /** Highest allowed degree of transition constraints; defaults to 16 */
        maxConstraintDegree: number;
    }

    export interface AirObject {

        readonly name                   : string;
        readonly field                  : FiniteField;
        readonly stateWidth             : number;
        readonly publicInputCount       : number;
        readonly secretInputCount       : number;
        readonly constraints            : ConstraintSpecs[];
        readonly maxConstraintDegree    : number;

        /** Creates verification context for the provided public inputs */
        createContext(publicInputs: bigint[][], extensionFactor: number): VerificationContext;

        /** Creates proof context for the provided public and secret inputs */
        createContext(publicInputs: bigint[][], secretInputs: bigint[][], extensionFactor: number): ProofContext;
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

    export interface VerificationContext extends EvaluationContext {
        /**
         * Evaluates transition constraints at the specified point
         * @param x Point in the evaluation domain at which to evaluate constraints
         * @param rValues Values of mutable registers at the current step
         * @param nValues Values of mutable registers at the next step
         * @param sValues Values of secret registers at the current step
         */
        evaluateConstraintsAt(x: bigint, rValues: bigint[], nValues: bigint[], sValues: bigint[]): bigint[];
    }

    export interface ProofContext extends EvaluationContext {
        readonly executionDomain    : Vector;
        readonly evaluationDomain   : Vector;
        readonly compositionDomain  : Vector;

        getSecretRegisterTraces(): Vector[];
        generateExecutionTrace(initValues: bigint[]): Matrix;
        evaluateExecutionTrace(executionTrace: Matrix): Matrix;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    export function parseScript(script: string, limits?: Partial<StarkLimits>, useWasm?: boolean): AirObject;
    export function parseScript(script: string, limits?: Partial<StarkLimits>, wasmOptions?: Partial<WasmOptions>): AirObject;
}