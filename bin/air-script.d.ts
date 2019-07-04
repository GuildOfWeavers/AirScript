declare module '@guildofweavers/air-script' {

    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------
    import { FiniteField } from '@guildofweavers/galois';
    export { FiniteField } from '@guildofweavers/galois';

    // INTERFACES
    // --------------------------------------------------------------------------------------------
    export interface StarkLimits {
        maxSteps                : number;
        maxMutableRegisters     : number;
        maxReadonlyRegisters    : number;
        maxConstraintCount      : number;
        maxConstraintDegree     : number;
    }

    /** Computes the next state of the execution trace */
    export interface TransitionFunction {
        /**
         * @param r Array with values of mutable registers at the current step
         * @param k Array with values of readonly registers at the current step
         * @param g Global constants available at any step
         * @param out Array to hold Values of mutable registers for the next step
         */
        (r: bigint[], k: bigint[], g: any, out: bigint[]): void;
    }

    /** Evaluates transition constraints at a given step of the computation */
    export interface ConstraintEvaluator {
        /**
         * @param r Array with values of mutable registers at the current step
         * @param n Array with values of mutable registers at the next step
         * @param k Array with values of readonly registers at the current step
         * @param g Global constants available at any step
         * @param out Array to hold values of constraint evaluated at the current step
         */
        (r: bigint[], n: bigint[], k: bigint[], g: any, out: bigint[]): void;
    }

    export interface StarkConfig {
        name                    : string;
        field                   : FiniteField;
        steps                   : number;
        mutableRegisterCount    : number;
        readonlyRegisters       : ReadonlyRegisterSpecs[];
        constraintCount         : number;
        transitionFunction      : TransitionFunction;
        constraintEvaluator     : ConstraintEvaluator;
        maxConstraintDegree     : number;
        globalConstants         : object;
    }

    export type ReadonlyValuePattern = 'repeat' | 'spread';

    export interface ReadonlyRegisterSpecs {
        values  : bigint[];
        pattern : ReadonlyValuePattern;
    }

    export class AirScriptError {
        readonly errors: any[];
        constructor(errors: any[]);
    }

    // CONTEXTS
    // --------------------------------------------------------------------------------------------
    export interface AirObject {

        readonly name                   : string;
        readonly field                  : FiniteField;
        readonly stateWidth             : number;
        readonly maxConstraintDegree    : number;

        createContext(publicInputs: bigint[][]): VerificationContext;
        createContext(publicInputs: bigint[][], secretInputs: bigint[][]): ProofContext;

        generateExecutionTrace(initValues: bigint[], ctx: ProofContext): bigint[][];
        evaluateExtendedTrace(extendedTrace: bigint[][], ctx: ProofContext): bigint[][];
        evaluateConstraintsAt(x: bigint, rValues: bigint[], nValues: bigint[], sValues: bigint[], ctx: VerificationContext): bigint[];
    }

    export interface EvaluationContext {
        readonly field              : FiniteField
        readonly traceLength        : number;
        readonly extensionFactor    : number;
        readonly rootOfUnity        : bigint;
        readonly executionDomain?   : bigint[];
        readonly evaluationDomain?  : bigint[];
    }

    export interface VerificationContext extends EvaluationContext {
        readonly stateWidth         : number;
        readonly secretInputCount   : number;
        readonly constraints        : ConstraintSpecs[];
        readonly kRegisters         : ComputedRegister[];
        readonly pRegisters         : ComputedRegister[];
    }

    export interface ProofContext extends VerificationContext {
        readonly executionDomain    : bigint[];
        readonly evaluationDomain   : bigint[];
        readonly sRegisters         : ComputedRegister[];
    }

    export interface ComputedRegister {
        getTraceValue(step: number): bigint;
        getEvaluation(position: number): bigint;
        getEvaluationAt(x: bigint): bigint;
    }
    
    export interface ConstantSpecs {
        values  : bigint[];
        pattern : 'repeat';
    }

    export interface ConstraintSpecs {
        degree  : number;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    export function parseScript(text: string, limits?: Partial<StarkLimits>): StarkConfig;
}