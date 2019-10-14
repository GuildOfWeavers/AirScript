"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const expressions_1 = require("./expressions");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class ScriptSpecs {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name, field, limits) {
        this.name = name;
        this.field = field;
        this.limits = limits;
        this.globalConstants = new Map();
        this.constantBindings = {};
    }
    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get transitionFunctionDegree() {
        return this.transitionFunction.isScalar
            ? [this.transitionFunction.degree]
            : this.transitionFunction.degree;
    }
    get transitionConstraintsDegree() {
        return this.transitionConstraints.degree;
    }
    get transitionConstraintsSpecs() {
        return this.transitionConstraintsDegree.map(degree => {
            return { degree: Number.parseInt(degree) };
        });
    }
    get maxTransitionConstraintDegree() {
        let result = 0;
        for (let degree of this.transitionConstraintsDegree) {
            if (degree > result) {
                result = Number.parseInt(degree);
            }
        }
        return result;
    }
    get readonlyRegisters() {
        return {
            staticRegisters: this.staticRegisters,
            secretRegisters: this.secretRegisters,
            publicRegisters: this.publicRegisters
        };
    }
    get inputBlock() {
        return {
            registerDepths: this.transitionFunction.inputRegisterSpecs,
            baseCycleMasks: this.transitionFunction.baseCycleMasks,
            baseCycleLength: this.transitionFunction.baseCycleLength
        };
    }
    get inputRegisterCount() {
        return this.transitionFunction.inputRegisterSpecs.length;
    }
    // PROPERTY SETTERS
    // --------------------------------------------------------------------------------------------
    setMutableRegisterCount(value) {
        this.mutableRegisterCount = validateMutableRegisterCount(value, this.limits);
    }
    setReadonlyRegisterCount(value) {
        this.readonlyRegisterCount = validateReadonlyRegisterCount(value, this.limits);
    }
    setReadonlyRegisters(registers) {
        validateReadonlyRegisterCounts(registers, this.readonlyRegisterCount);
        this.staticRegisters = registers.staticRegisters;
        this.secretRegisters = registers.secretRegisters;
        this.publicRegisters = registers.publicRegisters;
    }
    setConstraintCount(value) {
        this.constraintCount = validateConstraintCount(value, this.limits);
    }
    setGlobalConstants(declarations) {
        for (let constant of declarations) {
            if (this.globalConstants.has(constant.name)) {
                throw new Error(`Static constant '${constant.name}' is defined more than once`);
            }
            let constExpression = new expressions_1.LiteralExpression(constant.value, constant.name);
            this.globalConstants.set(constant.name, constExpression);
            if (utils_1.isMatrix(constant.dimensions)) {
                this.constantBindings[constant.name] = this.field.newMatrixFrom(constant.value);
            }
            else if (utils_1.isVector(constant.dimensions)) {
                this.constantBindings[constant.name] = this.field.newVectorFrom(constant.value);
            }
            else {
                this.constantBindings[constant.name] = constant.value;
            }
        }
    }
    setTransitionFunction(tFunctionBody) {
        if (tFunctionBody.dimensions[0] !== this.mutableRegisterCount) {
            if (this.mutableRegisterCount === 1)
                throw new Error(`transition function must evaluate to scalar or to a vector of exactly 1 value`);
            else
                throw new Error(`transition function must evaluate to a vector of exactly ${this.mutableRegisterCount} values`);
        }
        this.transitionFunction = tFunctionBody;
    }
    setTransitionConstraints(tConstraintsBody) {
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
exports.ScriptSpecs = ScriptSpecs;
// VALIDATORS
// ================================================================================================
function validateMutableRegisterCount(registerCount, limits) {
    registerCount = registerCount || 0;
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
        registerCount = Number.parseInt(registerCount);
    }
    return registerCount;
}
function validateReadonlyRegisterCount(registerCount, limits) {
    registerCount = registerCount || 0;
    if (registerCount > limits.maxReadonlyRegisters) {
        throw new Error(`Number of readonly registers cannot exceed ${limits.maxReadonlyRegisters}`);
    }
    else if (registerCount < 0) {
        throw new Error('Number of readonly registers must be positive');
    }
    else if (typeof registerCount === 'bigint') {
        registerCount = Number.parseInt(registerCount);
    }
    return registerCount;
}
function validateReadonlyRegisterCounts(registers, readonlyRegisterCount) {
    const totalRegisterCount = registers.staticRegisters.length
        + registers.secretRegisters.length
        + registers.publicRegisters.length;
    if (totalRegisterCount !== readonlyRegisterCount) {
        throw new Error(`expected ${readonlyRegisterCount} readonly registers, but ${totalRegisterCount} defined`);
    }
}
function validateConstraintCount(constraintCount, limits) {
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
        constraintCount = Number.parseInt(constraintCount);
    }
    return constraintCount;
}
//# sourceMappingURL=ScriptSpecs.js.map