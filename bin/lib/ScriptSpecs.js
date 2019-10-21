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
    setInputRegisterCount(value) {
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
    setInputRegisters(registers) {
        if (this.inputRegisters.length !== registers.length) {
            throw new Error(`expected ${this.inputRegisters.length} input registers, but ${registers.length} defined`);
        }
        for (let i = 0; i < registers.length; i++) {
            this.inputRegisters[i] = registers[i];
        }
    }
    setStateRegisterCount(value) {
        const registerCount = Number.parseInt(value);
        if (!Number.isInteger(registerCount))
            throw new Error(`number of state registers '${value}' is not an integer`);
        else if (registerCount <= 0)
            throw new Error('number of state registers must be greater than 0');
        else if (registerCount > this.limits.maxStateRegisters)
            throw new Error(`number of state registers cannot exceed ${this.limits.maxStateRegisters}`);
        else if (this.stateRegisterCount)
            throw new Error(`number of state registers has already been set`);
        this.stateRegisterCount = registerCount;
    }
    setStaticRegisterCount(value) {
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
    setStaticRegisters(registers) {
        if (this.staticRegisters.length !== registers.length) {
            throw new Error(`expected ${this.staticRegisters.length} static registers, but ${registers.length} defined`);
        }
        for (let i = 0; i < registers.length; i++) {
            this.staticRegisters[i] = registers[i];
        }
    }
    setConstraintCount(value) {
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
    setGlobalConstants(declarations) {
        for (let constant of declarations) {
            if (this.globalConstants.has(constant.name)) {
                throw new Error(`global constant '${constant.name}' is defined more than once`);
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
        if (tFunctionBody.dimensions[0] !== this.stateRegisterCount) {
            if (this.stateRegisterCount === 1)
                throw new Error(`transition function must evaluate to scalar or to a vector of exactly 1 value`);
            else
                throw new Error(`transition function must evaluate to a vector of exactly ${this.stateRegisterCount} values`);
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
//# sourceMappingURL=ScriptSpecs.js.map