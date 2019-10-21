// IMPORTS
// ================================================================================================
import {
    StarkLimits, ConstraintSpecs, FiniteField, InputBlockDescriptor, InputRegisterSpecs, StaticRegisterSpecs
} from '@guildofweavers/air-script';
import { ConstantDeclaration } from './visitor';
import { Expression, LiteralExpression, TransitionFunctionBody, TransitionConstraintsBody } from './expressions';
import { isMatrix, isVector } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class ScriptSpecs {

    private readonly limits     : StarkLimits;

    readonly name               : string;
    readonly field              : FiniteField;

    readonly globalConstants    : Map<string, Expression>;
    readonly constantBindings   : any;

    stateRegisterCount!         : number;
    constraintCount!            : number;

    inputRegisters!             : InputRegisterSpecs[];
    staticRegisters!            : StaticRegisterSpecs[];

    transitionFunction!         : TransitionFunctionBody;
    transitionConstraints!      : TransitionConstraintsBody;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name: string, field: FiniteField, limits: StarkLimits) {
        this.name = name;
        this.field = field;
        this.limits = limits;
        this.globalConstants = new Map();
        this.constantBindings = {};
    }

    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get transitionFunctionDegree(): bigint[] {
        return this.transitionFunction.isScalar 
            ? [this.transitionFunction.degree as bigint]
            : this.transitionFunction.degree as bigint[];
    }

    get transitionConstraintsDegree(): bigint[] {
        return this.transitionConstraints.degree as bigint[];
    }

    get transitionConstraintsSpecs(): ConstraintSpecs[] {
        return this.transitionConstraintsDegree.map( degree => {
            return { degree: Number.parseInt(degree as any) } as ConstraintSpecs;
        });
    }

    get maxTransitionConstraintDegree(): number {
        let result = 0;
        for (let degree of this.transitionConstraintsDegree) {
            if (degree > result) { result = Number.parseInt(degree as any); }
        }
        return result;
    }

    get inputBlock(): InputBlockDescriptor {
        return {
            registerDepths  : this.transitionFunction.inputRegisterSpecs,
            baseCycleMasks  : this.transitionFunction.baseCycleMasks,
            baseCycleLength : this.transitionFunction.baseCycleLength
        };
    }

    get inputRegisterCount(): number {
        return this.transitionFunction.inputRegisterSpecs.length;
    }

    // PROPERTY SETTERS
    // --------------------------------------------------------------------------------------------
    setInputRegisterCount(value: any): void {
        const registerCount = Number.parseInt(value);
        if (!Number.isInteger(registerCount))
            throw new Error(`number of input registers '${value}' is not an integer`);
        else if (registerCount <= 0)
            throw new Error('number of input registers must be greater than');
        else if (registerCount > this.limits.maxInputRegisters)
            throw new Error(`number of input registers cannot exceed ${this.limits.maxInputRegisters}`);
        else if (this.inputRegisters)
            throw new Error(`number of input registers has already been set`);

        this.inputRegisters = new Array(registerCount);
    }

    setInputRegisters(registers: InputRegisterSpecs[]): void {
        if (this.inputRegisters.length !== registers.length) {
            throw new Error(`expected ${this.inputRegisters.length} input registers, but ${registers.length} defined`);
        }

        for (let i = 0; i < registers.length; i++) {
            this.inputRegisters[i] = registers[i];
        }
    }

    setStateRegisterCount(value: any): void {
        const registerCount = Number.parseInt(value);
        if (!Number.isInteger(registerCount))
            throw new Error(`number of state registers '${value}' is not an integer`);
        else if (registerCount <= 0)
            throw new Error('number of state registers must be greater than 0');
        else if (registerCount > this.limits.maxStateRegisters)
            throw new Error(`number of state registers cannot exceed ${this.limits.maxStateRegisters}`);
        else if (this.stateRegisterCount)
            throw new Error(`number of state registers has already been set`);

        this.stateRegisterCount = registerCount
    }

    setStaticRegisterCount(value: any): void {
        const registerCount = Number.parseInt(value || 0);
        if (!Number.isInteger(registerCount))
            throw new Error(`number of static registers '${value}' is not an integer`);
        else if (registerCount < 0)
            throw new Error('number of static registers must be positive');
        else if (registerCount > this.limits.maxStaticRegisters)
            throw new Error(`number of static registers cannot exceed ${this.limits.maxStaticRegisters}`);
        else if (this.staticRegisters)
            throw new Error(`number of static registers has already been set`);

        this.staticRegisters = new Array(registerCount);
    }

    setStaticRegisters(registers: StaticRegisterSpecs[]): void {
        if (this.staticRegisters.length !== registers.length) {
            throw new Error(`expected ${this.staticRegisters.length} static registers, but ${registers.length} defined`);
        }

        for (let i = 0; i < registers.length; i++) {
            this.staticRegisters[i] = registers[i];
        }
    }

    setConstraintCount(value: any): void {
        const constraintCount = Number.parseInt(value);
        if (!Number.isInteger(constraintCount))
            throw new Error(`number of transition constraints '${value}' is not an integer`);
        else if (constraintCount <= 0)
            throw new Error('number of transition constraints must be greater than 0');
        else if (constraintCount > this.limits.maxConstraintCount)
            throw new Error(`number of transition constraints cannot exceed ${this.limits.maxConstraintCount}`);
        else if (this.constraintCount)
            throw new Error(`number of transition constraints has already been set`);
       
        this.constraintCount = constraintCount;
    }

    setGlobalConstants(declarations: ConstantDeclaration[]): void {
        for (let constant of declarations) {
            if (this.globalConstants.has(constant.name)) {
                throw new Error(`global constant '${constant.name}' is defined more than once`);
            }
            let constExpression = new LiteralExpression(constant.value, constant.name);
            this.globalConstants.set(constant.name, constExpression);
            if (isMatrix(constant.dimensions)) {
                this.constantBindings[constant.name] = this.field.newMatrixFrom(constant.value as bigint[][]);
            }
            else if (isVector(constant.dimensions)) {
                this.constantBindings[constant.name] = this.field.newVectorFrom(constant.value as bigint[]);
            }
            else {
                this.constantBindings[constant.name] = constant.value;
            }
        }
    }

    setTransitionFunction(tFunctionBody: TransitionFunctionBody): void {
        if (tFunctionBody.dimensions[0] !== this.stateRegisterCount) {
            if (this.stateRegisterCount === 1)
                throw new Error(`transition function must evaluate to scalar or to a vector of exactly 1 value`);
            else
                throw new Error(`transition function must evaluate to a vector of exactly ${this.stateRegisterCount} values`);
        }
        this.transitionFunction = tFunctionBody;
    }

    setTransitionConstraints(tConstraintsBody: TransitionConstraintsBody): void {
        if (tConstraintsBody.dimensions[0] !== this.constraintCount) {
            if (this.constraintCount === 1)
                throw new Error(`transition constraints must evaluate to scalar or to a vector of exactly 1 value`);
            else 
                throw new Error(`transition constraints must evaluate to a vector of exactly ${this.constraintCount} values`);
        }

        this.transitionConstraints = tConstraintsBody;

        for (let degree of this.transitionConstraintsDegree) {
            if (degree > this.limits.maxConstraintDegree)
                throw new Error(`degree of transition constraints cannot exceed ${this.limits.maxConstraintDegree}`);
            else if (degree < 0n)
                throw new Error('degree of transition constraints must be positive');
            else if (degree === 0n)
                throw new Error('degree of transition constraints cannot be 0');
        }
    }
}