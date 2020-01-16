// IMPORTS
// ================================================================================================
import { AirSchema, ProcedureContext, Expression, FiniteField } from "@guildofweavers/air-assembly";
import { Component, ProcedureSpecs, InputRegister } from "./Component";
import { TransitionSpecs } from "./TransitionSpecs";
import { RegisterRefs, validate } from "./utils";

// INTERFACES
// ================================================================================================
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

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name: string, modulus: bigint, traceWidth: number, constraintCount: number) {
        this.name = name;
        this.schema = new AirSchema('prime', modulus);
        this.traceWidth = traceWidth;
        this.constraintCount = constraintCount;
        this.inputRegisters = new Map();
        this.staticRegisters = new Map();
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
        //TODO: validateVariableName(name, dimensions);
        this.schema.addConstant(value, `$${name}`);
    }

    addInput(register: string, scope: string, binary: boolean): void {
        if (this.inputRegisters.get(register)) {
            throw new Error(`input register ${register} is defined more than once`);
        }
        this.inputRegisters.set(register, { scope, binary });

        /* TODO
        const index = Number(register.slice(2));
        if (index !== this.inputs.size) {
            throw new Error(`input register ${register} is defined out of order`);
        }
        */
    }

    addStatic(name: string, values: bigint[]): void {
        // TODO: check name
        this.staticRegisters.set(name, values);
    }

    createComponent(transitionSpecs: TransitionSpecs): Component {
        const segmentMasks = transitionSpecs.segments.map(s => s.mask);
        const procedureSpecs = this.buildProcedureSpecs(segmentMasks.length);
        const inputRegisters = this.buildInputRegisters(transitionSpecs);
        return new Component(this.schema, procedureSpecs, segmentMasks, inputRegisters);
    }

    setComponent(component: Component): void {
        // create component object
        const c = this.schema.createComponent(this.name, this.traceWidth, this.constraintCount, component.cycleLength);

        // add static registers to the component
        component.inputRegisters.forEach(r => c.addInputRegister(r.scope, r.binary, r.parent, r.steps, -1));
        component.segmentMasks.forEach(m => c.addCyclicRegister(m));
        this.staticRegisters.forEach(v => c.addCyclicRegister(v));

        // set trace initializer to return a vector of zeros
        const initContext = c.createProcedureContext('init');
        const zeroElement = initContext.buildLiteralValue(this.schema.field.zero);
        const initResult = initContext.buildMakeVectorExpression(new Array(this.traceWidth).fill(zeroElement));
        c.setTraceInitializer(initContext, [], initResult);

        // set transition function procedure to call transition function
        const tfContext = c.createProcedureContext('transition');
        const tfParams = this.buildProcedureParams(tfContext, component.segmentCount);
        const tfCall = tfContext.buildCallExpression(component.procedures.transition.name, tfParams);
        c.setTransitionFunction(tfContext, [], tfCall);

        // set constraint evaluator procedure to call constraint evaluator function
        const evContext = c.createProcedureContext('evaluation');
        const evParams = this.buildProcedureParams(evContext, component.segmentCount);
        const evCall = evContext.buildCallExpression(component.procedures.evaluation.name, evParams);
        c.setConstraintEvaluator(evContext, [], evCall);

        // add component to the schema
        this.schema.addComponent(c);
    }

    // HELPER METHODS
    // --------------------------------------------------------------------------------------------
    private buildProcedureSpecs(segmentCount: number): ProcedureSpecs {
        return {
            transition: {
                name    : `$${this.name}_transition`,
                result  : [this.traceWidth, 0],
                params  : [
                    { name: RegisterRefs.CurrentState,  dimensions: [this.traceWidth, 0] },
                    { name: RegisterRefs.Inputs,        dimensions: [this.inputRegisters.size, 0] },
                    { name: RegisterRefs.Segments,      dimensions: [segmentCount, 0] },
                    { name: RegisterRefs.Static,        dimensions: [this.staticRegisters.size, 0] }
                ]
            },
            evaluation: {
                name    : `$${this.name}_evaluation`,
                result  : [this.constraintCount, 0],
                params  : [
                    { name: RegisterRefs.CurrentState,  dimensions: [this.traceWidth, 0] },
                    { name: RegisterRefs.NextState,     dimensions: [this.traceWidth, 0] },
                    { name: RegisterRefs.Inputs,        dimensions: [this.inputRegisters.size, 0] },
                    { name: RegisterRefs.Segments,      dimensions: [segmentCount, 0] },
                    { name: RegisterRefs.Static,        dimensions: [this.staticRegisters.size, 0] }
                ]
            }
        };
    }

    private buildProcedureParams(context: ProcedureContext, segmentCount: number): Expression[] {
        const params: Expression[] = [];
        
        params.push(context.buildLoadExpression('load.trace', 0));
        if (context.name === 'evaluation') {
            params.push(context.buildLoadExpression('load.trace', 1));
        }

        let startIdx = 0, endIdx = this.inputRegisters.size - 1;
        let loadExpression = context.buildLoadExpression('load.static', 0);
        params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));

        startIdx = endIdx + 1;
        endIdx = startIdx + segmentCount - 1;
        loadExpression = context.buildLoadExpression('load.static', 0);
        params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));

        if (this.staticRegisters.size > 0) {
            startIdx = endIdx + 1;
            endIdx = startIdx + this.staticRegisters.size - 1;
            loadExpression = context.buildLoadExpression('load.static', 0);
            params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));
        }

        return params;
    }

    private buildInputRegisters(specs: TransitionSpecs): InputRegister[] {
        const registers: InputRegister[] = [];
        const registerSet = new Set<string>();

        let previousInputsCount = 0;
        for (let i = 0; i < specs.loops.length; i++) {
            let inputs = specs.loops[i].inputs;
            // TODO: handle multiple parents
            let parentIdx = (i === 0 ? undefined : registers.length - previousInputsCount);

            inputs.forEach(input => {
                validate(!registerSet.has(input), errors.overusedInputRegister(input));
                const register = this.inputRegisters.get(input);
                validate(register !== undefined, errors.undeclaredInputRegister(input));
    
                const isLeaf = (i === specs.loops.length - 1);
                registers.push({
                    scope   : register.scope,
                    binary  : register.binary,
                    parent  : parentIdx,
                    steps   : isLeaf ? specs.cycleLength : undefined
                });

                registerSet.add(input);
            });
            
            previousInputsCount = inputs.size;
        }

        return registers;
    }
}

// ERRORS
// ================================================================================================
const errors = {
    undeclaredInputRegister : (r: any) => `input register ${r} is used without being declared`,
    overusedInputRegister   : (r: any) => `input register ${r} is used at multiple levels`, // TODO: better message
};