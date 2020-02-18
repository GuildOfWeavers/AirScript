// IMPORTS
// ================================================================================================
import { compile, AirSchema, ProcedureContext, Expression, FiniteField, Dimensions, PrngSequence } from "@guildofweavers/air-assembly";
import { SymbolInfo, InputInfo, StaticRegister } from '@guildofweavers/air-script'
import * as path from 'path';
import { Component } from "./Component";
import { LoopTemplate } from "./templates";
import { validate, validateSymbolName, TRANSITION_FN_HANDLE, EVALUATION_FN_HANDLE, isCyclicRegister } from "./utils";
import { importConstants, importFunctions, ImportOffsets, importComponent } from "./importer";

// INTERFACES
// ================================================================================================
export interface ModuleOptions {
    readonly name   : string;
    readonly basedir: string;
}

export interface ImportMember {
    readonly member : string;
    readonly alias? : string;
}

// CLASS DEFINITION
// ================================================================================================
export class Module {

    readonly name               : string;
    readonly basedir            : string;
    readonly schema             : AirSchema;
    readonly traceWidth         : number;
    readonly constraintCount    : number;
    readonly auxRegisters       : StaticRegister[];

    private readonly symbols    : Map<string, SymbolInfo>;
    private inputRegisterCount  : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name: string, basedir: string, modulus: bigint, traceWidth: number, constraintCount: number) {
        this.name = name;
        this.basedir = basedir;
        this.schema = new AirSchema('prime', modulus);
        this.traceWidth = traceWidth;
        this.constraintCount = constraintCount;
        this.auxRegisters = [];
        this.symbols = new Map();
        this.inputRegisterCount = 0;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get field(): FiniteField {
        return this.schema.field;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addImport(filePath: string, members: ImportMember[]): void {

        // try to load the AirAssembly module specified by the file path
        const schema = loadSchema(this.basedir, filePath);
        
        // copy constants and functions
        const constOffset = importConstants(schema, this.schema);
        const funcOffset = importFunctions(schema, this.schema, constOffset);

        // extract members
        members.forEach(member => {

            const component = schema.components.get(member.member);
            if (!component) throw new Error('TODO: import component not found');

            let auxRegisterOffset = this.auxRegisters.length;
            component.staticRegisters.forEach(register => {
                if (isCyclicRegister(register)) {
                    this.auxRegisters.push({ values: register.values });
                }
            });

            const offsets: ImportOffsets = {
                constants       : constOffset,
                functions       : funcOffset,
                auxRegisters    : auxRegisterOffset,
                auxRegisterCount: this.auxRegisters.length
            };

            const symbols = importComponent(component, this.schema, offsets, member.alias);
            symbols.forEach(s => this.symbols.set(s.handle.substr(1), s));
        });
    }

    addConstant(name: string, value: bigint | bigint[] | bigint[][]): void {
        validateSymbolName(name);
        validate(!this.symbols.has(name), errors.dupSymbolDeclaration(name));
        const handle = `$${name}`;
        const index = this.schema.constants.length;
        this.schema.addConstant(value, handle);
        const dimensions = this.schema.constants[index].dimensions;
        this.symbols.set(name, { type: 'const', handle, dimensions, subset: false });
    }

    addInput(name: string, width: number, rank: number, scope: string, binary: boolean): void {
        validate(!this.symbols.has(name), errors.dupSymbolDeclaration(name));
        validate(width > 0, errors.invalidInputWidth(name));
        const offset = this.inputRegisterCount;
        this.inputRegisterCount = offset + width;
        const dimensions: Dimensions = width === 1 ? [0, 0] : [width, 0];
        this.symbols.set(name, { type: 'input', handle: name, offset, dimensions, subset: true, scope, binary, rank } as InputInfo);
    }

    addStatic(name: string, values: (bigint[] | PrngSequence)[]): void {
        validate(!this.symbols.has(name), errors.dupSymbolDeclaration(name));
        const index = this.auxRegisters.length;
        values.forEach((v => this.auxRegisters.push({ values: v })));
        const dimensions: Dimensions = values.length === 1 ? [0, 0] : [values.length, 0];
        this.symbols.set(name, { type: 'static', handle: name, offset: index, dimensions, subset: true });
    }

    createComponent(template: LoopTemplate): Component {
        return new Component(this.schema, this.traceWidth, this.constraintCount, template, this.symbols, this.auxRegisters);
    }

    setComponent(component: Component, componentName: string): void {
        // create component object
        const c = this.schema.createComponent(componentName, this.traceWidth, this.constraintCount, component.cycleLength);

        // add static registers to the component
        component.inputRegisters.forEach(r => c.addInputRegister(r.scope, r.binary, r.master, r.steps, -1));
        component.maskRegisters.forEach(r => c.addMaskRegister(r.input, false));
        component.segmentRegisters.forEach(r => {
            // rotate the mask by one position to the left, to align it with input position
            const mask = r.mask.slice();
            mask.push(mask.shift()!);
            c.addCyclicRegister(mask);
        });
        this.auxRegisters.forEach(r => c.addCyclicRegister(r.values));

        // set trace initializer to return a result of applying transition function to a vector of all zeros
        const initContext = c.createProcedureContext('init');
        const initParams = this.buildProcedureParams(initContext);
        const initCall = initContext.buildCallExpression(TRANSITION_FN_HANDLE, initParams);
        c.setTraceInitializer(initContext, [], initCall);

        // set transition function procedure to call transition function
        const tfContext = c.createProcedureContext('transition');
        const tfParams = this.buildProcedureParams(tfContext);
        const tfCall = tfContext.buildCallExpression(TRANSITION_FN_HANDLE, tfParams);
        c.setTransitionFunction(tfContext, [], tfCall);

        // set constraint evaluator procedure to call constraint evaluator function
        const evContext = c.createProcedureContext('evaluation');
        const evParams = this.buildProcedureParams(evContext);
        const evCall = evContext.buildCallExpression(EVALUATION_FN_HANDLE, evParams);
        c.setConstraintEvaluator(evContext, [], evCall);

        // add component to the schema
        this.schema.addComponent(c);
    }

    // HELPER METHODS
    // --------------------------------------------------------------------------------------------
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
}

// HELPER FUNCTIONS
// ================================================================================================
function loadSchema(basedir: string, filePath: string): AirSchema {
    if (!path.isAbsolute(filePath)) {
        filePath = path.resolve(basedir, filePath);
    }

    try {
        return compile(filePath);
    }
    catch(error) {
        throw new Error(`cannot not import from '${filePath}': ${error.message}`)
    }
}

// ERRORS
// ================================================================================================
const errors = {
    undeclaredInput         : (r: any) => `input '${r}' is used without being declared`,
    overusedInput           : (r: any) => `input '${r}' cannot resurface in inner loops`,
    invalidLoopInput        : (s: any) => `symbol '${s}' cannot be used in loop header`,
    invalidInputWidth       : (s: any) => `input '${s}' is invalid: input width must be greater than 0`,
    inputRankMismatch       : (s: any) => `rank of input '${s}' does not match loop depth`,
    dupSymbolDeclaration    : (s: any) => `symbol '${s}' is declared multiple times`,
    cycleLengthNotPowerOf2  : (s: any) => `total number of steps is ${s} but must be a power of 2`,
    intervalStepNotCovered  : (i: any) => `step ${i} is not covered by any expression`
};