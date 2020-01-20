// IMPORTS
// ================================================================================================
import { AirSchema, ProcedureContext, Expression, FiniteField, Dimensions, InputRegisterMaster } from "@guildofweavers/air-assembly";
import { Component, ProcedureSpecs, InputRegister } from "./Component";
import { ExecutionTemplate } from "./ExecutionTemplate";
import { validate, validateSymbolName, isPowerOf2, ProcedureParams } from "./utils";

// INTERFACES
// ================================================================================================
export interface SymbolInfo {
    readonly type       : 'const' | 'input' | 'static' | 'param';
    readonly handle     : string;
    readonly dimensions : Dimensions;
    readonly subset     : boolean;
    readonly offset?    : number;
}

export interface FunctionInfo {
    readonly handle : string;
}

interface Input {
    readonly scope  : string;
    readonly binary : boolean;
}

interface StaticRegister {
    readonly values : bigint[];
}

// CLASS DEFINITION
// ================================================================================================
export class Module {

    readonly name               : string;
    readonly schema             : AirSchema;
    readonly traceWidth         : number;
    readonly constraintCount    : number;
    readonly inputs             : Map<string, Input>;
    readonly staticRegisters    : StaticRegister[];

    private readonly symbols    : Map<string, SymbolInfo>;
    private inputRegisterCount  : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name: string, modulus: bigint, traceWidth: number, constraintCount: number) {
        this.name = name;
        this.schema = new AirSchema('prime', modulus);
        this.traceWidth = traceWidth;
        this.constraintCount = constraintCount;
        this.inputs = new Map();
        this.staticRegisters = [];
        this.symbols = new Map();
        this.inputRegisterCount = 0;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get field(): FiniteField {
        return this.schema.field;
    }

    get inputCount(): number {
        return this.inputs.size;
    }

    get staticCount(): number {
        return this.staticRegisters.length;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addConstant(name: string, value: bigint | bigint[] | bigint[][]): void {
        validateSymbolName(name);
        validate(!this.symbols.has(name), errors.constSymbolReDeclared(name));
        const handle = `$${name}`;
        const index = this.schema.constants.length;
        this.schema.addConstant(value, handle);
        const dimensions = this.schema.constants[index].dimensions;
        this.symbols.set(name, { type: 'const', handle, dimensions, subset: false });
    }

    addInput(name: string, width: number, scope: string, binary: boolean): void {
        validate(!this.symbols.has(name), errors.inputRegisterOverlap(name));
        const index = this.inputRegisterCount;
        this.inputRegisterCount = index + width;
        const dimensions: Dimensions = width === 1 ? [0, 0] : [width, 0];
        this.inputs.set(name, { scope, binary });
        this.symbols.set(name, { type: 'input', handle: name, offset: index, dimensions, subset: true });
    }

    addStatic(name: string, values: bigint[][]): void {
        validate(!this.symbols.has(name), errors.staticRegisterOverlap(name));
        const index = this.staticRegisters.length;
        values.forEach((v => this.staticRegisters.push({ values: v })));
        const dimensions: Dimensions = values.length === 1 ? [0, 0] : [values.length, 0];
        this.symbols.set(name, { type: 'static', handle: name, offset: index, dimensions, subset: true });
    }

    createComponent(template: ExecutionTemplate): Component {
        // make sure the template is valid
        validate(isPowerOf2(template.cycleLength), errors.cycleLengthNotPowerOf2(template.cycleLength));
        for (let i = 1; i < template.cycleLength; i++) {
            validate(template.getIntervalAt(i) !== undefined, errors.intervalStepNotCovered(i));
        }

        const procedureSpecs = this.buildProcedureSpecs(template);
        const symbols = this.transformSymbols(procedureSpecs.staticRegisterOffset);

        const functions = new Map<string, FunctionInfo>();
        functions.set('transition', { handle: procedureSpecs.transition.handle });

        return new Component(this.schema, procedureSpecs, symbols, functions);
    }

    setComponent(component: Component, componentName: string): void {
        // create component object
        const c = this.schema.createComponent(componentName, this.traceWidth, this.constraintCount, component.cycleLength);

        // add static registers to the component
        component.inputRegisters.forEach(r => c.addInputRegister(r.scope, r.binary, r.master, r.steps, -1));
        component.maskRegisters.forEach(r => c.addMaskRegister(r.input, false));
        component.segmentMasks.forEach(m => {
            // rotate the mask by one position to the left, to align it with input position
            m = m.slice();
            m.push(m.shift()!);
            c.addCyclicRegister(m);
        });
        this.staticRegisters.forEach(r => c.addCyclicRegister(r.values));

        // set trace initializer to return a result of applying transition function to a vector of all zeros
        const initContext = c.createProcedureContext('init');
        const initParams = this.buildProcedureParams(initContext);
        const initCall = initContext.buildCallExpression(component.transitionFunctionHandle, initParams);
        c.setTraceInitializer(initContext, [], initCall);

        // set transition function procedure to call transition function
        const tfContext = c.createProcedureContext('transition');
        const tfParams = this.buildProcedureParams(tfContext);
        const tfCall = tfContext.buildCallExpression(component.transitionFunctionHandle, tfParams);
        c.setTransitionFunction(tfContext, [], tfCall);

        // set constraint evaluator procedure to call constraint evaluator function
        const evContext = c.createProcedureContext('evaluation');
        const evParams = this.buildProcedureParams(evContext);
        const evCall = evContext.buildCallExpression(component.constraintEvaluatorHandle, evParams);
        c.setConstraintEvaluator(evContext, [], evCall);

        // add component to the schema
        this.schema.addComponent(c);
    }

    // HELPER METHODS
    // --------------------------------------------------------------------------------------------
    private buildProcedureSpecs(template: ExecutionTemplate): ProcedureSpecs {
        const inputRegisters = this.buildInputRegisters(template);
        const segmentMasks = template.segments.map(s => s.mask);
        const staticRegisterOffset = inputRegisters.length + segmentMasks.length + template.loops.length;
        const staticRegisterCount = staticRegisterOffset + this.staticCount;

        return {
            transition: {
                handle  : `$${this.name}_transition`,
                result  : [this.traceWidth, 0],
                params  : [
                    { name: ProcedureParams.thisTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: ProcedureParams.staticRow,    dimensions: [staticRegisterCount, 0] }
                ]
            },
            evaluation: {
                handle  : `$${this.name}_evaluation`,
                result  : [this.constraintCount, 0],
                params  : [
                    { name: ProcedureParams.thisTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: ProcedureParams.nextTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: ProcedureParams.staticRow,    dimensions: [staticRegisterCount, 0] }
                ]
            },
            inputRegisters, segmentMasks, staticRegisterOffset
        };
    }

    private buildProcedureParams(context: ProcedureContext): Expression[] {
        const params: Expression[] = [];
        
        if (context.name === 'init') {
            const zeroElement = context.buildLiteralValue(this.schema.field.zero);
            const zeroArray = new Array(this.traceWidth).fill(zeroElement);
            params.push(context.buildMakeVectorExpression(zeroArray));
        }
        else {
            params.push(context.buildLoadExpression('load.trace', 0));
            if (context.name === 'evaluation') {
                params.push(context.buildLoadExpression('load.trace', 1));
            }
        }

        params.push(context.buildLoadExpression('load.static', 0));

        return params;
    }

    private buildInputRegisters(template: ExecutionTemplate): InputRegister[] {
        const registers: InputRegister[] = [];
        const registerSet = new Set<string>();
        const anchors: number[] = [];
        
        let masterParent : InputRegisterMaster | undefined = undefined;
        template.loops.forEach((loop, i) => {
            anchors.push(registers.length);
            
            let j = 0;
            const masterPeer: InputRegisterMaster = { relation: 'peerof', index: registers.length };
            loop.inputs.forEach(inputName => {
                validate(!registerSet.has(inputName), errors.overusedInput(inputName));
                const input = this.inputs.get(inputName);
                validate(input !== undefined, errors.undeclaredInput(inputName));
                const symbol = this.symbols.get(inputName)!
                
                for (let k = 0; k < (symbol.dimensions[0] || 1); k++) {
                    const isAnchor = (j === 0);
                    const isLeaf = (i === template.loops.length - 1);
    
                    registers.push({
                        scope       : input.scope,
                        binary      : input.binary,
                        master      : isAnchor || isLeaf ? masterParent : masterPeer,
                        steps       : isLeaf ? template.cycleLength : undefined,
                        loopAnchor  : isAnchor
                    });
                    j++;
                }

                registerSet.add(inputName);
            });

            masterParent = { relation: 'childof', index: anchors[anchors.length - 1] };
        });

        return registers;
    }

    private transformSymbols(staticOffset: number): Map<string, SymbolInfo> {
        const symbols = new Map<string, SymbolInfo>();
        
        for (let [symbol, info] of this.symbols) {
            if (info.type === 'const') {
                symbols.set(symbol, info);
            }
            else if (info.type === 'input') {
                symbols.set(symbol, { ...info, type: 'param', handle: ProcedureParams.staticRow });
            }
            else if (info.type === 'static') {
                let offset = info.offset! + staticOffset;
                symbols.set(symbol, { ...info, type: 'param', handle: ProcedureParams.staticRow, offset });
            }
            else {
                // TODO: throw error
            }
        }

        // TODO: improve
        symbols.set('$r', { type: 'param', handle: '$_r', dimensions: [this.traceWidth, 0], subset: false });
        symbols.set('$n', { type: 'param', handle: '$_n', dimensions: [this.traceWidth, 0], subset: false });
        for (let i = 0; i < this.traceWidth; i++) {
            symbols.set(`$r${i}`, { type: 'param', handle: '$_r', offset: i, dimensions: [0, 0], subset: true });
            symbols.set(`$n${i}`, { type: 'param', handle: '$_n', offset: i, dimensions: [0, 0], subset: true });
        }

        return symbols;
    }
}

// ERRORS
// ================================================================================================
const errors = {
    undeclaredInput         : (r: any) => `input '${r}' is used without being declared`,
    overusedInput           : (r: any) => `input '${r}' cannot resurface in inner loops`,
    constSymbolReDeclared   : (s: any) => `symbol '${s}' is declared multiple times`,
    inputRegisterOverlap    : (r: any) => `input ${r} is declared more than once`,
    staticRegisterOverlap   : (r: any) => `static register ${r} is declared more than once`,
    staticRegisterOutOfOrder: (r: any) => `static register ${r} is declared out of order`,
    cycleLengthNotPowerOf2  : (s: any) => `total number of steps is ${s} but must be a power of 2`,
    intervalStepNotCovered  : (i: any) => `step ${i} is not covered by any expression`
};