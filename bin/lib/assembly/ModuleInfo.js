"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const expressions_1 = require("./expressions");
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class ModuleInfo {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(constants, sRegisters, iRegisters, tFunctionSig, tConstraintsSig) {
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
            return new expressions_1.LoadOperation(operation, index, this.sRegistersExpression);
        }
        else if (operation === 'load.input') {
            this.validateFrameIndex(index);
            return new expressions_1.LoadOperation(operation, index, this.iRegistersExpression);
        }
        else if (operation === 'load.local') {
            const localVar = this.getLocalVariable(index);
            if (!localVar.value)
                throw new Error(`local variable ${index} has not yet been set`);
            return new expressions_1.LoadOperation(operation, index, localVar.value);
        }
        else {
            throw new Error(`load operation '${operation}' is not valid`);
        }
    }
    buildStoreOperation(operation, index, value) {
        if (operation === 'save.local') {
            const localVar = this.getLocalVariable(index);
            if (utils_1.areSameDimensions(localVar.dimensions, value.dimensions)) {
                const vd = value.dimensions;
                throw new Error(`cannot store ${vd[0]}x${vd[1]} value in local variable ${index}`);
            }
            localVar.value = value;
            return new expressions_1.StoreOperation(operation, index, value);
        }
        else {
            throw new Error(`store operation '${operation}' is not valid`);
        }
    }
    // OUTPUT METHOD
    // --------------------------------------------------------------------------------------------
    toString() {
        let code = '';
        // TODO: field
        code += '\n' + this.constants.map(c => `(const ${c.toString()})`).join(' ');
        code += '\n' + this.staticRegisters.map(r => `(static ${r.pattern}${r.binary ? ' binary' : ''} ${r.values.join(' ')})`).join(' ');
        code += '\n' + this.inputRegisters.map(r => `(input${r.binary ? ' binary' : ''} ${r.secret ? 'secret' : 'public'})`).join(' ');
        // transition function
        const tfFrame = `(frame ${this.tFunctionSig.width} ${this.tFunctionSig.span})`;
        const tfLocals = this.tFunctionSig.locals.map(v => {
            if (utils_1.isScalar(v.dimensions))
                return `(local scalar)`;
            else if (utils_1.isVector(v.dimensions))
                return `(local vector ${v.dimensions[0]})`;
            else
                return `(local matrix ${v.dimensions[0]} ${v.dimensions[1]})`;
        }).join(' ');
        code += `\n(transition\n${tfFrame}\n${tfLocals})\n${this.tFunctionBody.toString()}`;
        // transition constraints
        const tcFrame = `(frame ${this.tConstraintsSig.width} ${this.tConstraintsSig.span})`;
        const tcLocals = this.tConstraintsSig.locals.map(v => {
            if (utils_1.isScalar(v.dimensions))
                return `(local scalar)`;
            else if (utils_1.isVector(v.dimensions))
                return `(local vector ${v.dimensions[0]})`;
            else
                return `(local matrix ${v.dimensions[0]} ${v.dimensions[1]})`;
        }).join(' ');
        code += `\n(evaluation\n${tcFrame}\n${tcLocals})\n${this.tConstraintsBody.toString()}`;
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