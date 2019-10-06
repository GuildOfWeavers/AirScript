// IMPORTS
// ================================================================================================
import { StarkLimits, ReadonlyRegisterSpecs, InputRegisterSpecs, ConstraintSpecs, FiniteField } from '@guildofweavers/air-script';
import { ReadonlyRegisterGroup, ConstantDeclaration } from './visitor';
import { Expression, LiteralExpression, TransitionExpression, LoopController, InputLoop } from './expressions';
import { isPowerOf2, isMatrix, isVector } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class ScriptSpecs {

    private readonly limits : StarkLimits;

    readonly name               : string;
    readonly field              : FiniteField;

    readonly globalConstants    : Map<string, Expression>;
    readonly constantBindings   : any;

    mutableRegisterCount!       : number;
    readonlyRegisterCount!      : number;
    staticRegisters!            : ReadonlyRegisterSpecs[];
    secretRegisters!            : InputRegisterSpecs[];
    publicRegisters!            : InputRegisterSpecs[];
    constraintCount!            : number;
    
    transitionFunction!         : InputLoop;
    transitionConstraints!      : TransitionExpression;

    loopController!             : LoopController;

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
        return this.transitionConstraints.isScalar 
            ? [this.transitionConstraints.degree as bigint]
            : this.transitionConstraints.degree as bigint[];
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

    get controlRegisters(): ReadonlyRegisterSpecs[] {
        return [];
        /*
        return this.loopController.values.map( values => {
            return { values, pattern: 'repeat', binary: true };
        });
        */
    }

    get baseCycleLength(): number {
        return this.loopController.baseCycleLength;
    }

    // PROPERTY SETTERS
    // --------------------------------------------------------------------------------------------
    setMutableRegisterCount(value: bigint): void {
        this.mutableRegisterCount = validateMutableRegisterCount(value, this.limits);
    }

    setReadonlyRegisterCount(value: bigint): void {
        this.readonlyRegisterCount = validateReadonlyRegisterCount(value, this.limits);
    }

    setReadonlyRegisterCounts(registers: ReadonlyRegisterGroup): void {
        validateReadonlyRegisterCounts(registers, this.readonlyRegisterCount);
        this.staticRegisters = registers.staticRegisters;
        this.secretRegisters = registers.secretRegisters;
        this.publicRegisters = registers.publicRegisters;
    }

    setConstraintCount(value: bigint): void {
        this.constraintCount = validateConstraintCount(value, this.limits);
    }

    setGlobalConstants(declarations: ConstantDeclaration[]): void {
        for (let constant of declarations) {
            if (this.globalConstants.has(constant.name)) {
                throw new Error(`Static constant '${constant.name}' is defined more than once`);
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

    setTransitionFunction(tFunctionBody: InputLoop): void {
        if (this.mutableRegisterCount === 1) {
            if (!tFunctionBody.isScalar && (!tFunctionBody.isVector || tFunctionBody.dimensions[0] !== 1)) {
                throw new Error(`transition function must evaluate to scalar or to a vector of exactly 1 value`);
            }
        }
        else {
            if (!tFunctionBody.isVector || tFunctionBody.dimensions[0] !== this.mutableRegisterCount) {
                throw new Error(`transition function must evaluate to a vector of exactly ${this.mutableRegisterCount} values`);
            }
        }

        this.transitionFunction = tFunctionBody;
        this.loopController = new LoopController(tFunctionBody);
    }

    setTransitionConstraints(tConstraintsBody: TransitionExpression): void {
        if (this.constraintCount === 1) {
            if (!tConstraintsBody.isScalar && (!tConstraintsBody.isVector || tConstraintsBody.dimensions[0] !== 1)) {
                throw new Error(`Transition constraints must evaluate to scalar or to a vector of exactly 1 value`);
            }
        }
        else {
            if (!tConstraintsBody.isVector || tConstraintsBody.dimensions[0] !== this.constraintCount) {
                throw new Error(`Transition constraints must evaluate to a vector of exactly ${this.constraintCount} values`);
            }
        }

        this.transitionConstraints = tConstraintsBody;
        this.loopController.validateConstraintMasks(tConstraintsBody.masks);

        for (let degree of this.transitionConstraintsDegree) {
            if (degree > this.limits.maxConstraintDegree) {
                throw new Error(`degree of transition constraints cannot exceed ${this.limits.maxConstraintDegree}`);
            }
            else if (degree < 0n) {
                throw new Error('degree of transition constraints must be positive');
            }
            else if (degree === 0n) {
                throw new Error('degree of transition constraints cannot be 0');
            }
        }
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function validateMutableRegisterCount(registerCount: number | bigint, limits: StarkLimits): number {
    if (registerCount > limits.maxMutableRegisters) {
        throw new Error(`Number of mutable registers cannot exceed ${limits.maxMutableRegisters}`);
    }
    else if (registerCount < 0) {
        throw new Error('Number of mutable registers must be positive');
    }
    else if (registerCount == 0) {
        throw new Error('You must define at least one mutable register');
    }
    else if (typeof registerCount === 'bigint') {
        registerCount = Number.parseInt(registerCount as any);
    }

    return registerCount;
}

function validateReadonlyRegisterCount(registerCount: number | bigint, limits: StarkLimits): number {
    if (registerCount > limits.maxReadonlyRegisters) {
        throw new Error(`Number of readonly registers cannot exceed ${limits.maxReadonlyRegisters}`);
    }
    else if (registerCount < 0) {
        throw new Error('Number of readonly registers must be positive');
    }
    else if (typeof registerCount === 'bigint') {
        registerCount = Number.parseInt(registerCount as any);
    }

    return registerCount;
}

function validateReadonlyRegisterCounts(registers: ReadonlyRegisterGroup, readonlyRegisterCount: number): void {

    const totalRegisterCount = 
        registers.staticRegisters.length
        + registers.secretRegisters.length
        + registers.publicRegisters.length;

    if (totalRegisterCount !== readonlyRegisterCount) {
        throw new Error(`expected ${readonlyRegisterCount} readonly registers, but ${totalRegisterCount} defined`);
    }
}

function validateConstraintCount(constraintCount: number | bigint, limits: StarkLimits): number {
    if (constraintCount > limits.maxConstraintCount) {
        throw new Error(`Number of transition constraints cannot exceed ${limits.maxConstraintCount}`);
    }
    else if (constraintCount < 0) {
        throw new Error('Number of transition constraints must be positive');
    }
    else if (constraintCount == 0) {
        throw new Error('You must define at least one transition constraint');
    }
    else if (typeof constraintCount === 'bigint') {
        constraintCount = Number.parseInt(constraintCount as any);
    }

    return constraintCount;
}