// IMPORTS
// ================================================================================================
import { StarkLimits } from '@guildofweavers/air-script';
import { FiniteField } from '@guildofweavers/galois';
import { ReadonlyRegisterSpecs, InputRegisterSpecs } from './registers';
import { ReadonlyRegisterGroup, ConstantDeclaration } from './visitor';
import { Expression, LiteralExpression } from './expressions';
import { isPowerOf2, isMatrix, isVector } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class ScriptSpecs {

    private readonly limits : StarkLimits;

    field!                  : FiniteField;
    steps!                  : number;
    mutableRegisterCount!   : number;
    readonlyRegisterCount!  : number;
    staticRegisters!        : ReadonlyRegisterSpecs[];
    secretRegisters!        : InputRegisterSpecs[];
    publicRegisters!        : InputRegisterSpecs[];
    constraintCount!        : number;
    staticConstants!        : Map<string, Expression>;
    constantBindings        : any;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(limits: StarkLimits) {
        this.limits = limits;
        this.staticConstants = new Map();
        this.constantBindings = {};
    }

    // PROPERTY SETTERS
    // --------------------------------------------------------------------------------------------
    setField(value: FiniteField) {
        this.field = value;
    }

    setSteps(value: bigint) {
        this.steps = validateSteps(value, this.limits);
    }

    setMutableRegisterCount(value: bigint) {
        this.mutableRegisterCount = validateMutableRegisterCount(value, this.limits);
    }

    setReadonlyRegisterCount(value: bigint) {
        this.readonlyRegisterCount = validateReadonlyRegisterCount(value, this.limits);
    }

    setReadonlyRegisterCounts(registers: ReadonlyRegisterGroup) {
        validateReadonlyRegisterCounts(registers, this.readonlyRegisterCount);
        this.staticRegisters = registers.staticRegisters;
        this.secretRegisters = registers.secretRegisters;
        this.publicRegisters = registers.publicRegisters;
    }

    setConstraintCount(value: bigint) {
        this.constraintCount = validateConstraintCount(value, this.limits);
    }

    setStaticConstants(declarations: ConstantDeclaration[]) {
        for (let constant of declarations) {
            if (this.staticConstants.has(constant.name)) {
                throw new Error(`Static constant '${constant.name}' is defined more than once`);
            }
            let constExpression = new LiteralExpression(constant.value, constant.name);
            this.staticConstants.set(constant.name, constExpression);
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

    // VALIDATORS
    // --------------------------------------------------------------------------------------------
    validateConstraintDegree(constraintDegree: bigint): number {
        if (constraintDegree > this.limits.maxConstraintDegree) {
            throw new Error(`Degree of transition constraints cannot exceed ${this.limits.maxConstraintDegree}`);
        }
        else if (constraintDegree < 0n) {
            throw new Error('Degree of transition constraints must be positive');
        }
        else if (constraintDegree === 0n) {
            throw new Error('Degree of transition constraints cannot be 0');
        }
    
        return Number.parseInt(constraintDegree as any);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function validateSteps(steps: number | bigint, limits: StarkLimits): number {
    if (steps > limits.maxSteps) {
        throw new Error(`Number of steps cannot exceed ${limits.maxSteps}`);
    }
    else if (steps < 0) {
        throw new Error('Number of steps must be greater than 0');
    }
    else if (!isPowerOf2(steps)) {
        throw new Error('Number of steps must be a power of 2');
    }
    else if (typeof steps === 'bigint') {
        steps = Number.parseInt(steps as any);
    }

    return steps;
}

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

function validateReadonlyRegisterCounts(registers: ReadonlyRegisterGroup, readonlyRegisterCount: number) {

    const totalRegisterCount = 
        registers.staticRegisters.length
        + registers.secretRegisters.length
        + registers.publicRegisters.length;

    if (totalRegisterCount > readonlyRegisterCount) {
        throw new Error(`Too many readonly register definitions: ${readonlyRegisterCount} registers expected`);
    }
    else if (totalRegisterCount < readonlyRegisterCount) {
        throw new Error(`Missing readonly register definitions: ${readonlyRegisterCount} registers expected`);
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