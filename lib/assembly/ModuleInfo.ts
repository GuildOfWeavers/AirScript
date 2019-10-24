// IMPORTS
// ================================================================================================
import { StarkLimits } from "@guildofweavers/air-script";
import { Expression, ConstantValue, LoadExpression, RegisterBank, StoreExpression } from "./expressions";
import { FieldDeclaration, StaticRegister, InputRegister, LocalVariable } from "./declarations";
import { getLoadSource, getStoreTarget } from "./expressions/utils";

// INTERFACES
// ================================================================================================
export interface TransitionSignature {
    width       : number;
    span        : number;
    locals      : LocalVariable[];
}

export interface TransitionBody {
    statements  : StoreExpression[];
    output      : Expression;
}

// CLASS DEFINITION
// ================================================================================================
export class ModuleInfo {

    readonly fieldDeclaration       : FieldDeclaration;

    readonly constants              : ConstantValue[];
    readonly staticRegisters        : StaticRegister[];
    readonly inputRegisters         : InputRegister[];

    private readonly tFunctionSig   : TransitionSignature;
    private tFunctionBody?          : TransitionBody;

    private readonly tConstraintsSig: TransitionSignature;
    private tConstraintsBody?       : TransitionBody;

    private traceRegisterBank       : RegisterBank;
    private staticRegisterBank?     : RegisterBank;
    private inputRegisterBank?      : RegisterBank;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(
        field: FieldDeclaration,
        constants: ConstantValue[], sRegisters: StaticRegister[], iRegisters: InputRegister[],
        tFunctionSig: TransitionSignature, tConstraintsSig: TransitionSignature
    ) {
        this.fieldDeclaration = field;
        this.constants = constants;
        this.staticRegisters = sRegisters;
        this.inputRegisters = iRegisters;
        this.tFunctionSig = tFunctionSig;
        this.tConstraintsSig = tConstraintsSig;

        this.traceRegisterBank = new RegisterBank('trace', this.stateWidth);
        if (this.staticRegisters.length > 0)
            this.staticRegisterBank = new RegisterBank('static', this.staticRegisters.length);
        if (this.inputRegisters.length > 0)
            this.inputRegisterBank = new RegisterBank('input', this.inputRegisters.length);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get stateWidth(): number {
        return this.tFunctionSig.width;
    }

    get constraintCount(): number {
        return this.tConstraintsSig.width;
    }

    get constraintDegrees(): bigint[] {
        return this.tConstraintsBody!.output.degree as bigint[];
    }

    get maxConstraintDegree(): bigint {
        return (this.constraintDegrees).reduce((p, c) => c > p ? c : p, 0n);
    }

    get inTransitionFunction(): boolean {
        return (this.tFunctionBody === undefined);
    }

    get transitionFunctionBody(): TransitionBody {
        if (!this.tFunctionBody) throw new Error(`transition function body hasn't been set`);
        return this.tFunctionBody;
    }

    set transitionFunctionBody(value: TransitionBody) {
        if (this.tFunctionBody)
            throw new Error(`transition function body has already been set`);
        else if (!value.output.isVector)
            throw new Error(`transition function must evaluate to a vector`);
        else if (value.output.dimensions[0] !== this.stateWidth)
            throw new Error(`transition function must evaluate to a vector of ${this.stateWidth} elements`);

        this.tFunctionBody = value;
    }

    get transitionConstraintsBody(): TransitionBody {
        if (!this.tConstraintsBody) throw new Error(`transition constraints body hasn't been set`);
        return this.tConstraintsBody;
    }

    set transitionConstraintsBody(value: TransitionBody) {
        if (this.tConstraintsBody)
            throw new Error(`transition constraints body has already been set`);
        else if (!value.output.isVector)
            throw new Error(`transition constraints must evaluate to a vector`);
        else if (value.output.dimensions[0] !== this.constraintCount)
            throw new Error(`transition constraints must evaluate to a vector of ${this.constraintCount} elements`);

        this.tConstraintsBody = value;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    buildLoadExpression(operation: string, index: number): LoadExpression {
        const source = getLoadSource(operation);
        if (source === 'const') {
            if (index <= this.constants.length)
                throw new Error(`constant with index ${index} has not been defined`);
            return new LoadExpression(this.constants[index], index);
        }
        else if (source === 'trace') {
            this.validateFrameIndex(index);
            return new LoadExpression(this.traceRegisterBank, index);
        }
        else if (source === 'static') {
            this.validateFrameIndex(index);
            if (!this.staticRegisterBank)
                throw new Error(`static registers have not been defined`);
            return new LoadExpression(this.staticRegisterBank, index);
        }
        else if (source === 'input') {
            this.validateFrameIndex(index);
            if (!this.inputRegisterBank)
                throw new Error(`input registers have not been defined`);
            return new LoadExpression(this.inputRegisterBank, index);
        }
        else if (source === 'local') {
            const variable = this.getLocalVariable(index);
            const binding = variable.getBinding(index);
            return new LoadExpression(binding, index);
        }
        else {
            throw new Error(`${operation} is not a valid load operation`);
        }
    }

    buildStoreExpression(operation: string, index: number, value: Expression): StoreExpression {
        const target = getStoreTarget(operation);
        if (target === 'local') {
            const variable = this.getLocalVariable(index);
            const result = new StoreExpression(operation, index, value);
            variable.bind(result, index);
            return result;
        }
        else {
            throw new Error(`${operation} is not a valid store operation`);
        }
    }

    validateLimits(limits: StarkLimits): void {
        if (this.stateWidth > limits.maxStateRegisters)
            throw new Error(`number of state registers cannot exceed ${limits.maxStateRegisters}`);
        else if (this.inputRegisters.length > limits.maxInputRegisters)
            throw new Error(`number of input registers cannot exceed ${limits.maxInputRegisters}`);
        else if (this.staticRegisters.length > limits.maxStateRegisters)
            throw new Error(`number of static registers cannot exceed ${limits.maxStaticRegisters}`);
        else if (this.constraintCount > limits.maxConstraintCount)
            throw new Error(`number of transition constraints cannot exceed ${limits.maxConstraintCount}`);
        else if (this.maxConstraintDegree > limits.maxConstraintDegree)
            throw new Error(`degree of transition constraints cannot exceed ${this.maxConstraintDegree}`);
    }

    // OPTIMIZATION
    // --------------------------------------------------------------------------------------------
    compress(): void {
        // compress transition function
        cleanStatements(this.tFunctionBody!);
        cleanLocals(this.tFunctionSig, this.tFunctionBody!);
        this.tFunctionBody!.output.compress();

        // compress transition constraints
        cleanStatements(this.tConstraintsBody!);
        cleanLocals(this.tConstraintsSig, this.tConstraintsBody!);
        this.tConstraintsBody!.output.compress();
    }

    // CODE OUTPUT
    // --------------------------------------------------------------------------------------------
    toString() {
        // field, constants, static and input registers
        let code = `\n  ${this.fieldDeclaration.toString()}`;
        if (this.constants.length > 0)
            code += '\n  ' + this.constants.map(c => `(const ${c.toString()})`).join(' ');
        if (this.staticRegisters.length > 0)
            code += `\n  ${this.staticRegisters.map(r => r.toString()).join(' ')}`;
        if (this.inputRegisters.length > 0)
            code += `\n  ${this.inputRegisters.map(r => r.toString()).join(' ')}`;
        
        // transition function
        let tFunction = `\n    (frame ${this.tFunctionSig.width} ${this.tFunctionSig.span})`;
        if (this.tFunctionSig.locals.length > 0)
            tFunction += `\n    ${this.tFunctionSig.locals.map(v => v.toString()).join(' ')}`;
        tFunction += this.tFunctionBody!.statements.map(s => `\n    ${s.toString()}`).join('');
        tFunction += `\n    ${this.tFunctionBody!.output.toString()}`;
        code += `\n  (transition${tFunction})`;

        // transition constraints
        let tConstraints = `\n    (frame ${this.tConstraintsSig.width} ${this.tConstraintsSig.span})`;
        if (this.tConstraintsSig.locals.length > 0)
            tConstraints += `\n    ${this.tConstraintsSig.locals.map(v => v.toString()).join(' ')}`;
        tConstraints += this.tConstraintsBody!.statements.map(s => `\n    ${s.toString()}`).join('');
        tConstraints += `\n    ${this.tConstraintsBody!.output.toString()}`;
        code += `\n  (evaluation${tConstraints})`;

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

// HELPER FUNCTIONS
// ================================================================================================
function cleanStatements(body: TransitionBody): void {

    const expressions = [...body.statements, body.output];

    const bindings = new Map<Expression, Expression[]>();
    expressions.forEach(e => e.collectLoadOperations('local', bindings));

    const retainedStatements: StoreExpression[] = [];
    for (let i = 0; i < body.statements.length; i++) {
        let statement = body.statements[i];
        let dependents = bindings.get(statement);
        if (!dependents) continue;
        if (dependents.length === 1) {
            let dependent = dependents[0];
            expressions.slice(i).forEach(e => e.replace(dependent, statement.value));
        }
        else if (dependents.length > 1) {
            retainedStatements.push(statement);
        }
    }

    body.statements = retainedStatements;
}

function cleanLocals(signature: TransitionSignature, body: TransitionBody) {
    signature.locals.forEach(v => v.clearBinding());
    body.statements.forEach(s => signature.locals[s.index].bind(s, s.index));

    for (let i = 0; i < signature.locals.length; i++) {
        let variable = signature.locals[i];
        if (variable.isBound) continue;
        let nextIdx = findNextNonEmptyLocal(signature.locals, i + 1);
        if (nextIdx) {
            signature.locals[i] = signature.locals[nextIdx];
            signature.locals[nextIdx] = variable;
        }
        else {
            signature.locals.length = i;
            break;
        }
    }
}

function findNextNonEmptyLocal(locals: LocalVariable[], start: number): number {
    for (let i = start; i < locals.length; i++) {
        if (locals[i].isBound) return i;
    }
    return 0;
}