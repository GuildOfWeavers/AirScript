"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const expressions_1 = require("./expressions");
// CLASS DEFINITION
// ================================================================================================
class ModuleInfo {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(field, constants, sRegisters, iRegisters, tFunctionSig, tConstraintsSig) {
        this.field = field;
        this.constants = constants;
        this.staticRegisters = sRegisters;
        this.inputRegisters = iRegisters;
        this.tFunctionSig = tFunctionSig;
        this.tConstraintsSig = tConstraintsSig;
        const tRegistersDegree = new Array(this.stateWidth).fill(1n);
        this.tRegistersExpression = new expressions_1.NoopExpression([this.stateWidth, 0], tRegistersDegree);
        const sRegistersDegree = new Array(this.staticRegisters.length).fill(1n);
        this.sRegistersExpression = new expressions_1.NoopExpression([this.staticRegisters.length, 0], sRegistersDegree);
        const iRegistersDegree = new Array(this.inputRegisters.length).fill(1n);
        this.iRegistersExpression = new expressions_1.NoopExpression([this.inputRegisters.length, 0], iRegistersDegree);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get stateWidth() {
        return this.tFunctionSig.width;
    }
    get constraintCount() {
        return this.tConstraintsSig.width;
    }
    get inTransitionFunction() {
        return (this.tFunctionBody === undefined);
    }
    get transitionFunctionBody() {
        if (!this.tFunctionBody)
            throw new Error(`transition function body hasn't been set`);
        return this.tFunctionBody;
    }
    set transitionFunctionBody(value) {
        if (this.tFunctionBody)
            throw new Error(`transition function body has already been set`);
        else if (!value.isVector)
            throw new Error(`transition function must evaluate to a vector`);
        else if (value.dimensions[0] !== this.stateWidth)
            throw new Error(`transition function must evaluate to a vector of ${this.stateWidth} elements`);
        this.tFunctionBody = value;
    }
    get transitionConstraintsBody() {
        if (!this.tConstraintsBody)
            throw new Error(`transition constraints body hasn't been set`);
        return this.tConstraintsBody;
    }
    set transitionConstraintsBody(value) {
        if (this.tConstraintsBody)
            throw new Error(`transition constraints body has already been set`);
        else if (!value.isVector)
            throw new Error(`transition constraints must evaluate to a vector`);
        else if (value.dimensions[0] !== this.constraintCount)
            throw new Error(`transition constraints must evaluate to a vector of ${this.constraintCount} elements`);
        this.tConstraintsBody = value;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    buildLoadOperation(operation, index) {
        if (operation === 'load.const') {
            if (index <= this.constants.length)
                throw new Error(`constant with index ${index} has not been defined`);
            return new expressions_1.LoadOperation(operation, index, this.constants[index]);
        }
        else if (operation === 'load.trace') {
            this.validateFrameIndex(index);
            return new expressions_1.LoadOperation(operation, index, this.tRegistersExpression);
        }
        else if (operation === 'load.fixed') {
            this.validateFrameIndex(index);
            if (this.staticRegisters.length === 0)
                throw new Error('static registers have not been defined');
            return new expressions_1.LoadOperation(operation, index, this.sRegistersExpression);
        }
        else if (operation === 'load.input') {
            this.validateFrameIndex(index);
            if (this.staticRegisters.length === 0)
                throw new Error('input registers have not been defined');
            return new expressions_1.LoadOperation(operation, index, this.iRegistersExpression);
        }
        else if (operation === 'load.local') {
            const variable = this.getLocalVariable(index);
            const value = variable.getValue(index);
            return new expressions_1.LoadOperation(operation, index, value);
        }
        else {
            throw new Error(`load operation '${operation}' is not valid`);
        }
    }
    buildStoreOperation(operation, index, value) {
        if (operation === 'save.local') {
            const variable = this.getLocalVariable(index);
            variable.setValue(value, index);
            return new expressions_1.StoreOperation(operation, index, value);
        }
        else {
            throw new Error(`store operation '${operation}' is not valid`);
        }
    }
    // OUTPUT METHOD
    // --------------------------------------------------------------------------------------------
    toString() {
        let code = `\n  ${this.field.toString()}`;
        if (this.constants.length > 0) {
            code += '\n  ' + this.constants.map(c => `(const ${c.toString()})`).join(' ');
        }
        if (this.staticRegisters.length > 0) {
            code += '\n  ' + this.staticRegisters.map(r => r.toString()).join(' ');
        }
        if (this.inputRegisters.length > 0) {
            code += '\n  ' + this.inputRegisters.map(r => r.toString()).join(' ');
        }
        // transition function
        let tFunction = `\n    (frame ${this.tFunctionSig.width} ${this.tFunctionSig.span})`;
        if (this.tFunctionSig.locals.length > 0) {
            tFunction += '\n    ' + this.tFunctionSig.locals.map(v => v.toString()).join(' ');
        }
        tFunction += `\n    ${this.tFunctionBody.toString()}`;
        code += `\n  (transition${tFunction})`;
        // transition constraints
        let tConstraints = `\n    (frame ${this.tConstraintsSig.width} ${this.tConstraintsSig.span})`;
        if (this.tConstraintsSig.locals.length > 0) {
            tConstraints += `\n    ` + this.tConstraintsSig.locals.map(v => v.toString()).join(' ');
        }
        tConstraints += `\n    ${this.tConstraintsBody.toString()}`;
        code += `\n  (evaluation${tConstraints})`;
        return `(module${code}\n)`;
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    getLocalVariable(index) {
        const locals = (this.inTransitionFunction)
            ? this.tFunctionSig.locals
            : this.tConstraintsSig.locals;
        if (index >= locals.length)
            throw new Error(`local variable ${index} has not defined`);
        return locals[index];
    }
    validateFrameIndex(index) {
        if (this.inTransitionFunction) {
            if (index > 0)
                throw new Error('cannot access future register states from transition function');
        }
        else {
            if (index > 1)
                throw new Error('cannot access register states beyond the next step from transition constraints');
        }
    }
}
exports.ModuleInfo = ModuleInfo;
//# sourceMappingURL=ModuleInfo.js.map