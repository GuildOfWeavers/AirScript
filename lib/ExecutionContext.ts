// IMPORTS
// ================================================================================================
import { InputRegisterSpecs, StaticRegisterSpecs } from '@guildofweavers/air-script';
import { ScriptSpecs } from './ScriptSpecs';
import { validateVariableName, Dimensions } from './utils';
import { Expression, SymbolReference, SubroutineCall, ExtractVectorElement } from './expressions';

// INTERFACES
// ================================================================================================
interface RegisterBankInfo {
    name        : string;
    reference   : SymbolReference;
    future      : boolean;
}

interface RegisterInfo {
    name        : string;
    bank        : RegisterBankInfo;
    reference   : Expression;
}

// CLASS DEFINITION
// ================================================================================================
export class ExecutionContext {

    readonly globalConstants        : Map<string, Expression>;
    readonly localVariables         : Map<string, SymbolReference>[];
    readonly subroutines            : Map<string, string>;
    readonly stateRegisterCount     : number;
    readonly tFunctionDegree?       : bigint[];

    readonly staticRegisters        : StaticRegisterSpecs[];

    readonly loopFrames             : (Set<number> | undefined)[];

    private conditionalBlockCounter : number;


    private readonly registerBankMap: Map<string, RegisterBankInfo>;
    private readonly registerMap    : Map<string, RegisterInfo>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(specs: ScriptSpecs) {
        this.subroutines = new Map();
        this.localVariables = [new Map()];
        this.globalConstants = specs.globalConstants;
        this.stateRegisterCount = specs.stateRegisterCount;
        this.staticRegisters = specs.staticRegisters;
        if (specs.transitionFunction) {
            this.tFunctionDegree = specs.transitionFunctionDegree;
        }
        this.loopFrames = [];
        this.conditionalBlockCounter = -1;

        this.registerBankMap = new Map();
        this.registerMap = new Map();
        buildRegisterMaps(specs, this.registerBankMap, this.registerMap);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get inTransitionFunction(): boolean {
        return (this.tFunctionDegree === undefined);
    }

    get inInputBlock(): boolean {
        return (this.loopFrames.length !== 0);
    }

    // SYMBOLIC REFERENCES
    // --------------------------------------------------------------------------------------------
    getSymbolReference(symbol: string): Expression {
        if (symbol.startsWith('$')) {
            if (symbol.length > 2) {
                return this.getRegisterReference(symbol);
            }
            else {
                return this.getRegisterBank(symbol);
            }
        }
        else {
            const ref = this.getVariableReference(symbol);
            if (!ref) {
                throw new Error(`variable '${symbol}' is not defined`);
            }
            else {
                return ref;
            }
        }
    }

    // LOOPS
    // --------------------------------------------------------------------------------------------
    addLoopFrame(registers?: string[]): number {
        if (!registers) {
            return this.loopFrames.push(undefined) - 1;
        } 
        else {
            const lastFrame = this.loopFrames[this.loopFrames.length - 1];
            const newFrame = new Set<number>();
            for (let i = 0; i < registers.length; i++) {
                let regIdx = Number.parseInt(registers[i].slice(2), 10);
                if (lastFrame && !lastFrame.has(regIdx))
                    throw new Error(`invalid loop declaration: register $i${regIdx} is absent from the parent loop`);
                else if (newFrame.has(regIdx))
                    throw new Error(`invalid loop declaration: register $i${regIdx} is listed more than once`);

                newFrame.add(regIdx);
            }
    
            return this.loopFrames.push(newFrame) - 1;
        }
    }

    getControlReference(index: number): Expression {
        const controlCount = Math.ceil(Math.log2(this.loopFrames.length));
        const degree = new Array(this.loopFrames.length).fill(BigInt(controlCount));
        const controlBank = new SymbolReference('c', [this.loopFrames.length, 0], degree);
        return new ExtractVectorElement(controlBank, index);
    }

    // VARIABLES
    // --------------------------------------------------------------------------------------------
    setVariableAssignment(variable: string, expression: Expression): SymbolReference {
        if (this.globalConstants.has(variable)) {
            throw new Error(`value of global constant '${variable}' cannot be changed`);
        }
        
        // get the last frame from the local variable stack
        const localVariables = this.localVariables[this.localVariables.length - 1];

        const refCode = `$${variable}`;
        let sExpression = localVariables.get(variable);
        if (sExpression) {
            if (!sExpression.isSameDimensions(expression)) {
                throw new Error(`dimensions of variable '${variable}' cannot be changed`);
            }

            if (sExpression.degree !== expression.degree) {
                sExpression = new SymbolReference(refCode, expression.dimensions, expression.degree);
                localVariables.set(variable, sExpression);
            }
        }
        else {
            if (this.getVariableReference(variable)) {
                throw new Error(`value of variable '${variable}' cannot be changed out of scope`);
            }

            validateVariableName(variable, expression.dimensions);
            sExpression = new SymbolReference(refCode, expression.dimensions, expression.degree);
            localVariables.set(variable, sExpression);
        }

        return sExpression;
    }

    private getVariableReference(variable: string): Expression | undefined {
        if (this.globalConstants.has(variable)) {
            // check for variable in global constants
            return this.globalConstants.get(variable)!;
        }
        else {
            // search for the variable in the local variable stack
            for (let i = this.localVariables.length - 1; i >= 0; i--) {
                let scope = this.localVariables[i];
                if (scope.has(variable)) {
                    return scope.get(variable)!;
                }
            }
        }
    }

    createNewVariableFrame() {
        this.localVariables.push(new Map());
    }

    destroyVariableFrame() {
        if (this.localVariables.length === 1) {
            throw new Error('cannot destroy last variable frame');
        }
        this.localVariables.pop();
    }

    // REGISTERS
    // --------------------------------------------------------------------------------------------
    isBinaryRegister(register: string): boolean {
        const bankName = register.slice(1, 2);
        const index = Number.parseInt(register.slice(2), 10);

        if (bankName === 'k')       return this.staticRegisters[index].binary;
        else throw new Error(`register ${register} cannot be restricted to binary values`);
    }

    private getRegisterReference(reference: string): Expression {
        const bankName = reference.slice(1, 2);
        const index = Number.parseInt(reference.slice(2), 10);
        
        const bankLength = this.getRegisterBankLength(bankName);
        if (index >= bankLength) {
            if (bankLength === 0) throw new Error(`invalid register reference ${reference}: no $${bankName} registers have been defined`);
            else if (bankLength === 1) throw new Error(`invalid register reference ${reference}: only 1 $${bankName} register has been defined`);
            else throw new Error(`invalid register reference ${reference}: only ${bankLength} $${bankName} registers have been defined`);
        }
        else if (bankName === 'i') {
            const lastFrame = this.loopFrames[this.loopFrames.length - 1]!;
            if (!lastFrame.has(index)) {
                throw new Error(`register ${reference} is out of scope`);
            }
        }
        const bankRef = new SymbolReference(bankName, [bankLength, 0], new Array(bankLength).fill(1n));
        return new ExtractVectorElement(bankRef, index);
    }

    private getRegisterBankLength(bankName: string): number {
        const loopFrame = this.loopFrames[this.loopFrames.length - 1];
        if (bankName === 'i') {
            if (!loopFrame) {
                throw new Error(`$i registers cannot be accessed outside of init block`);
            }
            return this.loopFrames[0]!.size;
        }
        else if (bankName === 'n') {
            if (this.inTransitionFunction) {
                throw new Error(`$n registers cannot be accessed in transition function`);
            }
            return this.stateRegisterCount
        }
        else if (loopFrame && this.loopFrames.length === 1) {
            throw new Error(`$${bankName} registers cannot be accessed in the init clause of a top-level input loop`);
        }
        else if (bankName === 'r')  return this.stateRegisterCount;
        else if (bankName === 'k')  return this.staticRegisters.length;
        else throw new Error(`register bank name $${bankName} is invalid`);
    }

    private getRegisterBank(bankName: string): Expression {
        const bank = this.registerBankMap.get(bankName);
        if (!bank) {
            throw new Error(`register bank name ${bankName} is invalid`);
        }
        return bank.reference;
    }

    // SUBROUTINES
    // --------------------------------------------------------------------------------------------
    getTransitionFunctionCall(): SubroutineCall {
        if (this.inTransitionFunction) {
            throw new Error(`transition function cannot call itself recursively`);
        }
        else if (this.inInputBlock) {
            throw new Error(`transition function cannot be called from an input block`);
        }
        const dimensions: Dimensions = [this.stateRegisterCount, 0];
        return new SubroutineCall('applyTransition', ['r', 'k', 'i', 'c'], dimensions, this.tFunctionDegree!);
    }

    // CONDITIONAL EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    getNextConditionalBlockId(): number {
        this.conditionalBlockCounter++;
        return this.conditionalBlockCounter;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function buildRegisterMaps(specs: ScriptSpecs, registerBankMap: Map<string, RegisterBankInfo>, registerMap: Map<string, RegisterInfo>): void {

    // build state register info
    const stateWidth = specs.stateRegisterCount;
    const rRegisterBank = new SymbolReference('r', [stateWidth, 0], new Array(stateWidth).fill(1n));
    const rBankInfo = { name: `$r`, reference: rRegisterBank, future: false };
    registerBankMap.set(rBankInfo.name, rBankInfo);

    const nRegisterBank = new SymbolReference('n', [stateWidth, 0], new Array(stateWidth).fill(1n));
    const nBankInfo = { name: `$n`, reference: nRegisterBank, future: true };
    registerBankMap.set(nBankInfo.name, nBankInfo);

    for (let i = 0; i < stateWidth; i++) {
        const rRef = new ExtractVectorElement(rBankInfo.reference, i);
        registerMap.set(`$r${i}`, { name: `$r${i}`, reference: rRef, bank: rBankInfo });

        const nRef = new ExtractVectorElement(nBankInfo.reference, i);
        registerMap.set(`$n${i}`, { name: `$n${i}`, reference: nRef, bank: nBankInfo });
    }

    // build static register info
    const kBankSize = specs.staticRegisters.length;
    const kRegisterBank = new SymbolReference('k', [kBankSize, 0], new Array(kBankSize).fill(1n));
    const kBankInfo = { name: `$k`, reference: kRegisterBank, future: false };
    registerBankMap.set(kBankInfo.name, kBankInfo);

    for (let i = 0; i < kBankSize; i++) {
        let register = specs.staticRegisters[i];
        let reference = new ExtractVectorElement(kBankInfo.reference, i);
        registerMap.set(register.name, { name: register.name, reference, bank: kBankInfo });
    }

    // build input register info
    const iBankSize = specs.inputRegisters.length, iBankDegree = new Array(iBankSize);
    const iRegisterBank = new SymbolReference('i', [iBankSize, 0], iBankDegree);
    const iBankInfo = { name: `$i`, reference: iRegisterBank, future: false };
    registerBankMap.set(iBankInfo.name, iBankInfo);

    for (let i = 0; i < iBankSize; i++) {
        let register = specs.inputRegisters[i];
        let reference = new ExtractVectorElement(iBankInfo.reference, i);
        registerMap.set(register.name, { name: register.name, reference, bank: iBankInfo });
        iBankDegree[i] = (register.rank === 0) ? 0n : 1n;
    }
}