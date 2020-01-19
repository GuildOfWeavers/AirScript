// IMPORTS
// ================================================================================================
import { AirSchema, ProcedureContext, Expression, FiniteField, Dimensions } from "@guildofweavers/air-assembly";
import { Component, ProcedureSpecs, InputRegister } from "./Component";
import { ExecutionTemplate } from "./ExecutionTemplate";
import { validate, validateSymbolName, CONTROLLER_NAME, isPowerOf2 } from "./utils";

// INTERFACES
// ================================================================================================
export interface SymbolInfo {
    readonly type       : 'const' | 'input' | 'static' | 'param';
    readonly handle     : string;
    readonly dimensions : Dimensions;
    readonly subset     : boolean;
    readonly offset?    : number;
}

interface Input {
    readonly scope  : string;
    readonly binary : boolean;
}

// CLASS DEFINITION
// ================================================================================================
export class Module {

    readonly name                   : string;
    readonly schema                 : AirSchema;
    readonly traceWidth             : number;
    readonly constraintCount        : number;
    readonly inputRegisters         : Map<string, Input>;
    readonly staticRegisters        : Map<string, bigint[]>;

    private readonly symbols        : Map<string, SymbolInfo>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name: string, modulus: bigint, traceWidth: number, constraintCount: number) {
        this.name = name;
        this.schema = new AirSchema('prime', modulus);
        this.traceWidth = traceWidth;
        this.constraintCount = constraintCount;
        this.inputRegisters = new Map();
        this.staticRegisters = new Map();
        this.symbols = new Map();
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get field(): FiniteField {
        return this.schema.field;
    }

    get inputRegisterCount(): number {
        return this.inputRegisters.size;
    }

    get staticRegisterCount(): number {
        return this.staticRegisters.size;
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

    addInput(name: string, index: number, scope: string, binary: boolean): void {
        validate(!this.symbols.has(name), errors.inputRegisterOverlap(name));
        validate(index === this.inputRegisterCount, errors.inputRegisterOutOfOrder(name));
        this.inputRegisters.set(name, { scope, binary });
        this.symbols.set(name, { type: 'input', handle: name, offset: index, dimensions: [0, 0], subset: true });
    }

    addStatic(name: string, index: number, values: bigint[]): void {
        validate(!this.symbols.has(name), errors.staticRegisterOverlap(name));
        validate(index === this.staticRegisterCount, errors.staticRegisterOutOfOrder(name));
        this.staticRegisters.set(name, values);
        this.symbols.set(name, { type: 'static', handle: name, offset: index, dimensions: [0, 0], subset: true });
    }

    createComponent(template: ExecutionTemplate): Component {
        // make sure the template is valid
        validate(isPowerOf2(template.cycleLength), errors.cycleLengthNotPowerOf2(template.cycleLength));
        for (let i = 1; i < template.cycleLength; i++) {
            validate(template.getIntervalAt(i) !== undefined, errors.intervalStepNotCovered(i));
        }

        const loopDrivers = template.loops.map(loop => loop.driver);
        const segmentMasks = template.segments.map(s => s.mask);
        const procedureSpecs = this.buildProcedureSpecs(segmentMasks.length, loopDrivers.length);
        const inputRegisters = this.buildInputRegisters(template);
        const symbols = this.transformSymbols(segmentMasks.length, loopDrivers.length);
        return new Component(this.schema, procedureSpecs, segmentMasks, inputRegisters, loopDrivers, symbols);
    }

    setComponent(component: Component, componentName: string): void {
        // create component object
        const c = this.schema.createComponent(componentName, this.traceWidth, this.constraintCount, component.cycleLength);

        // add static registers to the component
        component.inputRegisters.forEach(r => c.addInputRegister(r.scope, r.binary, r.parent, r.steps, -1));
        component.loopDrivers.forEach(d => c.addMaskRegister(d, false));
        component.segmentMasks.forEach(m => {
            // rotate the mask by one position to the left, to align it with input position
            m = m.slice();
            m.push(m.shift()!);
            c.addCyclicRegister(m);
        });
        this.staticRegisters.forEach(v => c.addCyclicRegister(v));

        const controllerCount = component.segmentCount + component.loopDrivers.length;

        // set trace initializer to return a result of applying transition function to a vector of all zeros
        const initContext = c.createProcedureContext('init');
        const initParams = this.buildProcedureParams(initContext, controllerCount);
        const initCall = initContext.buildCallExpression(component.procedures.transition.name, initParams);
        c.setTraceInitializer(initContext, [], initCall);

        // set transition function procedure to call transition function
        const tfContext = c.createProcedureContext('transition');
        const tfParams = this.buildProcedureParams(tfContext, controllerCount);
        const tfCall = tfContext.buildCallExpression(component.procedures.transition.name, tfParams);
        c.setTransitionFunction(tfContext, [], tfCall);

        // set constraint evaluator procedure to call constraint evaluator function
        const evContext = c.createProcedureContext('evaluation');
        const evParams = this.buildProcedureParams(evContext, controllerCount);
        const evCall = evContext.buildCallExpression(component.procedures.evaluation.name, evParams);
        c.setConstraintEvaluator(evContext, [], evCall);

        // add component to the schema
        this.schema.addComponent(c);
    }

    // HELPER METHODS
    // --------------------------------------------------------------------------------------------
    private buildProcedureSpecs(segmentCount: number, loopCount: number): ProcedureSpecs {
        const staticRegisterCount = this.staticRegisterCount + segmentCount + this.inputRegisterCount + loopCount;
        return {
            transition: {
                name    : `$${this.name}_transition`,
                result  : [this.traceWidth, 0],
                params  : [
                    { name: '$_r',  dimensions: [this.traceWidth, 0] },
                    { name: '$_k',  dimensions: [staticRegisterCount, 0] }
                ]
            },
            evaluation: {
                name    : `$${this.name}_evaluation`,
                result  : [this.constraintCount, 0],
                params  : [
                    { name: '$_r',  dimensions: [this.traceWidth, 0] },
                    { name: '$_n',  dimensions: [this.traceWidth, 0] },
                    { name: '$_k',  dimensions: [staticRegisterCount, 0] }
                ]
            }
        };
    }

    private buildProcedureParams(context: ProcedureContext, controllerCount: number): Expression[] {
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

        /*
        let startIdx = 0, endIdx = this.inputRegisters.size - 1;
        let loadExpression = context.buildLoadExpression('load.static', 0);
        params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));

        startIdx = endIdx + 1;
        endIdx = startIdx + controllerCount - 1;
        loadExpression = context.buildLoadExpression('load.static', 0);
        params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));

        if (this.staticRegisters.size > 0) {
            startIdx = endIdx + 1;
            endIdx = startIdx + this.staticRegisters.size - 1;
            loadExpression = context.buildLoadExpression('load.static', 0);
            params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));
        }
        */

        return params;
    }

    private buildInputRegisters(template: ExecutionTemplate): InputRegister[] {
        const registers: InputRegister[] = [];
        const registerSet = new Set<string>();

        let previousInputsCount = 0;
        for (let i = 0; i < template.loops.length; i++) {
            let inputs = template.loops[i].inputs;
            // TODO: handle multiple parents
            let parentIdx = (i === 0 ? undefined : registers.length - previousInputsCount);

            inputs.forEach(input => {
                validate(!registerSet.has(input), errors.overusedInputRegister(input));
                const register = this.inputRegisters.get(input);
                validate(register !== undefined, errors.undeclaredInputRegister(input));
    
                const isLeaf = (i === template.loops.length - 1);
                registers.push({
                    scope   : register.scope,
                    binary  : register.binary,
                    parent  : parentIdx,
                    steps   : isLeaf ? template.cycleLength : undefined
                });

                registerSet.add(input);
            });
            
            previousInputsCount = inputs.size;
        }

        return registers;
    }

    private transformSymbols(segmentCount: number, loopCount: number) {
        const symbols = new Map<string, SymbolInfo>();
        const staticOffset = this.inputRegisterCount + loopCount + segmentCount;
        for (let [symbol, info] of this.symbols) {
            if (info.type === 'const') {
                symbols.set(symbol, info);
            }
            else if (info.type === 'input') {
                symbols.set(symbol, { ...info, type: 'param', handle: '$_k' });
            }
            else if (info.type === 'static') {
                let offset = info.offset! + staticOffset;
                symbols.set(symbol, { ...info, type: 'param', handle: '$_k', offset });
            }
            else {
                // TODO: throw error
            }
        }

        symbols.set('$i', { type: 'param', handle: '$_k', dimensions: [this.inputRegisterCount, 0], subset: false });
        symbols.set('$k', { type: 'param', handle: '$_k', dimensions: [this.staticRegisterCount, 0], subset: false });
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
    undeclaredInputRegister : (r: any) => `input register ${r} is used without being declared`,
    overusedInputRegister   : (r: any) => `input register ${r} cannot resurface in inner loops`,
    constSymbolReDeclared   : (s: any) => `symbol '${s}' is declared multiple times`,
    inputRegisterOverlap    : (r: any) => `input register ${r} is declared more than once`,
    inputRegisterOutOfOrder : (r: any) => `input register ${r} is declared out of order`,
    staticRegisterOverlap   : (r: any) => `static register ${r} is declared more than once`,
    staticRegisterOutOfOrder: (r: any) => `static register ${r} is declared out of order`,
    cycleLengthNotPowerOf2  : (s: any) => `total number of steps is ${s} but must be a power of 2`,
    intervalStepNotCovered  : (i: any) => `step ${i} is not covered by any expression`
};