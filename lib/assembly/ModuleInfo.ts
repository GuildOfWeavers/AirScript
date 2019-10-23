// IMPORTS
// ================================================================================================
import { Expression, ConstantValue, ExpressionDegree, LoadOperation, NoopExpression, StoreOperation } from "./expressions";
import { Dimensions, areSameDimensions, isScalar, isVector, isMatrix } from "../utils";

// INTERFACES
// ================================================================================================
export interface TransitionSignature {
    width       : number;
    span        : number;
    locals      : LocalVariable[];
}

export interface LocalVariable {
    dimensions  : Dimensions;
    degree      : ExpressionDegree;
    value?      : Expression;
}

export interface StaticRegister {
    pattern : 'repeat' | 'spread';
    binary  : boolean;
    values  : bigint[];
}

export interface InputRegister {
    binary  : boolean;
    secret  : boolean;
}

// CLASS DEFINITION
// ================================================================================================
export class ModuleInfo {

    readonly constants              : ConstantValue[];
    readonly staticRegisters        : StaticRegister[];
    readonly inputRegisters         : InputRegister[];

    private readonly tFunctionSig   : TransitionSignature;
    private tFunctionBody?          : Expression;

    private readonly tConstraintsSig: TransitionSignature;
    private tConstraintsBody?       : Expression;

    private tRegistersExpression    : Expression;
    private sRegistersExpression    : Expression;
    private iRegistersExpression    : Expression;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(constants: ConstantValue[], sRegisters: StaticRegister[], iRegisters: InputRegister[], tFunctionSig: any, tConstraintsSig: any) {
        this.constants = constants;
        this.staticRegisters = sRegisters;
        this.inputRegisters = iRegisters;
        this.tFunctionSig = tFunctionSig;
        this.tConstraintsSig = tConstraintsSig;

        const tRegistersDegree = new Array(this.stateWidth).fill(1n);
        this.tRegistersExpression = new NoopExpression([this.stateWidth, 0], tRegistersDegree);
        const sRegistersDegree = new Array(this.staticRegisters.length).fill(1n);
        this.sRegistersExpression = new NoopExpression([this.staticRegisters.length, 0], sRegistersDegree);
        const iRegistersDegree = new Array(this.inputRegisters.length).fill(1n);
        this.iRegistersExpression = new NoopExpression([this.inputRegisters.length, 0], iRegistersDegree);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get stateWidth(): number {
        return this.tFunctionSig.width;
    }

    get constraintCount(): number {
        return this.tConstraintsSig.width;
    }

    get inTransitionFunction(): boolean {
        return (this.tFunctionBody === undefined);
    }

    get transitionFunctionBody(): Expression {
        if (!this.tFunctionBody) throw new Error(`transition function body hasn't been set`);
        return this.tFunctionBody;
    }

    set transitionFunctionBody(value: Expression) {
        if (this.tFunctionBody)
            throw new Error(`transition function body has already been set`);
        else if (!value.isVector)
            throw new Error(`transition function must evaluate to a vector`);
        else if (value.dimensions[0] !== this.stateWidth)
            throw new Error(`transition function must evaluate to a vector of ${this.stateWidth} elements`);

        this.tFunctionBody = value;
    }

    get transitionConstraintsBody(): Expression {
        if (!this.tConstraintsBody) throw new Error(`transition constraints body hasn't been set`);
        return this.tConstraintsBody;
    }

    set transitionConstraintsBody(value: Expression) {
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
    buildLoadOperation(operation: string, index: number): LoadOperation {
        if (operation === 'load.const') {
            if (index <= this.constants.length)
                throw new Error(`constant with index ${index} has not been defined`);
            return new LoadOperation(operation, index, this.constants[index]);
        }
        else if (operation === 'load.trace') {
            this.validateFrameIndex(index);
            return new LoadOperation(operation, index, this.tRegistersExpression);
        }
        else if (operation === 'load.fixed') {
            this.validateFrameIndex(index);
            return new LoadOperation(operation, index, this.sRegistersExpression);
        }
        else if (operation === 'load.input') {
            this.validateFrameIndex(index);
            return new LoadOperation(operation, index, this.iRegistersExpression);
        }
        else if (operation === 'load.local') {
            const localVar = this.getLocalVariable(index);
            if (!localVar.value)
                throw new Error(`local variable ${index} has not yet been set`);

            return new LoadOperation(operation, index, localVar.value);
        }
        else {
            throw new Error(`load operation '${operation}' is not valid`)
        }
    }

    buildStoreOperation(operation: string, index: number, value: Expression): StoreOperation {
        if (operation === 'save.local') {
            const localVar = this.getLocalVariable(index);
            if (areSameDimensions(localVar.dimensions, value.dimensions)) {
                const vd = value.dimensions;
                throw new Error(`cannot store ${vd[0]}x${vd[1]} value in local variable ${index}`);
            }
            localVar.value = value;
            return new StoreOperation(operation, index, value);
        }
        else {
            throw new Error(`store operation '${operation}' is not valid`)
        }
    }

    // OUTPUT METHOD
    // --------------------------------------------------------------------------------------------
    toString() {
        let code = '';

        // TODO: field
        code += '\n' + this.constants.map(c => `(const ${c.toString()})`).join(' ');
        code += '\n' + this.staticRegisters.map(r => 
            `(static ${r.pattern}${r.binary ? ' binary' : ''} ${r.values.join(' ')})`).join(' ');
        code += '\n' + this.inputRegisters.map(r => 
            `(input${r.binary ? ' binary' : ''} ${r.secret ? 'secret' : 'public'})`).join(' ');
        
        // transition function
        const tfFrame = `(frame ${this.tFunctionSig.width} ${this.tFunctionSig.span})`;
        const tfLocals = this.tFunctionSig.locals.map(v => {
            if (isScalar(v.dimensions)) return `(local scalar)`;
            else if (isVector(v.dimensions)) return `(local vector ${v.dimensions[0]})`;
            else return `(local matrix ${v.dimensions[0]} ${v.dimensions[1]})`;
        }).join(' ');
        code += `\n(transition\n${tfFrame}\n${tfLocals})\n${this.tFunctionBody!.toString()}`;

        // transition constraints
        const tcFrame = `(frame ${this.tConstraintsSig.width} ${this.tConstraintsSig.span})`;
        const tcLocals = this.tConstraintsSig.locals.map(v => {
            if (isScalar(v.dimensions)) return `(local scalar)`;
            else if (isVector(v.dimensions)) return `(local vector ${v.dimensions[0]})`;
            else return `(local matrix ${v.dimensions[0]} ${v.dimensions[1]})`;
        }).join(' ');
        code += `\n(evaluation\n${tcFrame}\n${tcLocals})\n${this.tConstraintsBody!.toString()}`;

        return `(module${code}\n)`;
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    getLocalVariable(index: number): LocalVariable {
        const locals = (this.inTransitionFunction)
            ? this.tFunctionSig.locals
            : this.tConstraintsSig.locals;

        if (index >= locals.length)
            throw new Error(`local variable ${index} has not defined`);
        
        return locals[index];
    }

    validateFrameIndex(index: number) {
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