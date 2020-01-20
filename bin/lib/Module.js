"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const air_assembly_1 = require("@guildofweavers/air-assembly");
const Component_1 = require("./Component");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class Module {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name, modulus, traceWidth, constraintCount) {
        this.name = name;
        this.schema = new air_assembly_1.AirSchema('prime', modulus);
        this.traceWidth = traceWidth;
        this.constraintCount = constraintCount;
        this.inputs = new Map();
        this.staticRegisters = [];
        this.symbols = new Map();
        this.inputRegisterCount = 0;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get field() {
        return this.schema.field;
    }
    get inputCount() {
        return this.inputs.size;
    }
    get staticCount() {
        return this.staticRegisters.length;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addConstant(name, value) {
        utils_1.validateSymbolName(name);
        utils_1.validate(!this.symbols.has(name), errors.constSymbolReDeclared(name));
        const handle = `$${name}`;
        const index = this.schema.constants.length;
        this.schema.addConstant(value, handle);
        const dimensions = this.schema.constants[index].dimensions;
        this.symbols.set(name, { type: 'const', handle, dimensions, subset: false });
    }
    addInput(name, width, scope, binary) {
        utils_1.validate(!this.symbols.has(name), errors.inputRegisterOverlap(name));
        const index = this.inputRegisterCount;
        this.inputRegisterCount = index + width;
        const dimensions = width === 1 ? [0, 0] : [width, 0];
        this.inputs.set(name, { scope, binary });
        this.symbols.set(name, { type: 'input', handle: name, offset: index, dimensions, subset: true });
    }
    addStatic(name, values) {
        utils_1.validate(!this.symbols.has(name), errors.staticRegisterOverlap(name));
        const index = this.staticRegisters.length;
        values.forEach((v => this.staticRegisters.push({ values: v })));
        const dimensions = values.length === 1 ? [0, 0] : [values.length, 0];
        this.symbols.set(name, { type: 'static', handle: name, offset: index, dimensions, subset: true });
    }
    createComponent(template) {
        // make sure the template is valid
        utils_1.validate(utils_1.isPowerOf2(template.cycleLength), errors.cycleLengthNotPowerOf2(template.cycleLength));
        for (let i = 1; i < template.cycleLength; i++) {
            utils_1.validate(template.getIntervalAt(i) !== undefined, errors.intervalStepNotCovered(i));
        }
        const procedureSpecs = this.buildProcedureSpecs(template);
        const symbols = this.transformSymbols(procedureSpecs.staticRegisterOffset);
        const functions = new Map();
        functions.set('transition', { handle: procedureSpecs.transition.handle });
        return new Component_1.Component(this.schema, procedureSpecs, symbols, functions);
    }
    setComponent(component, componentName) {
        // create component object
        const c = this.schema.createComponent(componentName, this.traceWidth, this.constraintCount, component.cycleLength);
        // add static registers to the component
        component.inputRegisters.forEach(r => c.addInputRegister(r.scope, r.binary, r.master, r.steps, -1));
        component.maskRegisters.forEach(r => c.addMaskRegister(r.input, false));
        component.segmentMasks.forEach(m => {
            // rotate the mask by one position to the left, to align it with input position
            m = m.slice();
            m.push(m.shift());
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
    buildProcedureSpecs(template) {
        const inputRegisters = this.buildInputRegisters(template);
        const segmentMasks = template.segments.map(s => s.mask);
        const staticRegisterOffset = inputRegisters.length + segmentMasks.length + template.loops.length;
        const staticRegisterCount = staticRegisterOffset + this.staticCount;
        return {
            transition: {
                handle: `$${this.name}_transition`,
                result: [this.traceWidth, 0],
                params: [
                    { name: utils_1.ProcedureParams.thisTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: utils_1.ProcedureParams.staticRow, dimensions: [staticRegisterCount, 0] }
                ]
            },
            evaluation: {
                handle: `$${this.name}_evaluation`,
                result: [this.constraintCount, 0],
                params: [
                    { name: utils_1.ProcedureParams.thisTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: utils_1.ProcedureParams.nextTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: utils_1.ProcedureParams.staticRow, dimensions: [staticRegisterCount, 0] }
                ]
            },
            inputRegisters, segmentMasks, staticRegisterOffset
        };
    }
    buildProcedureParams(context) {
        const params = [];
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
    buildInputRegisters(template) {
        const registers = [];
        const registerSet = new Set();
        const anchors = [];
        let masterParent = undefined;
        template.loops.forEach((loop, i) => {
            anchors.push(registers.length);
            let j = 0;
            const masterPeer = { relation: 'peerof', index: registers.length };
            loop.inputs.forEach(inputName => {
                utils_1.validate(!registerSet.has(inputName), errors.overusedInput(inputName));
                const input = this.inputs.get(inputName);
                utils_1.validate(input !== undefined, errors.undeclaredInput(inputName));
                const symbol = this.symbols.get(inputName);
                for (let k = 0; k < (symbol.dimensions[0] || 1); k++) {
                    const isAnchor = (j === 0);
                    const isLeaf = (i === template.loops.length - 1);
                    registers.push({
                        scope: input.scope,
                        binary: input.binary,
                        master: isAnchor || isLeaf ? masterParent : masterPeer,
                        steps: isLeaf ? template.cycleLength : undefined,
                        loopAnchor: isAnchor
                    });
                    j++;
                }
                registerSet.add(inputName);
            });
            masterParent = { relation: 'childof', index: anchors[anchors.length - 1] };
        });
        return registers;
    }
    transformSymbols(staticOffset) {
        const symbols = new Map();
        for (let [symbol, info] of this.symbols) {
            if (info.type === 'const') {
                symbols.set(symbol, info);
            }
            else if (info.type === 'input') {
                symbols.set(symbol, { ...info, type: 'param', handle: utils_1.ProcedureParams.staticRow });
            }
            else if (info.type === 'static') {
                let offset = info.offset + staticOffset;
                symbols.set(symbol, { ...info, type: 'param', handle: utils_1.ProcedureParams.staticRow, offset });
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
exports.Module = Module;
// ERRORS
// ================================================================================================
const errors = {
    undeclaredInput: (r) => `input '${r}' is used without being declared`,
    overusedInput: (r) => `input '${r}' cannot resurface in inner loops`,
    constSymbolReDeclared: (s) => `symbol '${s}' is declared multiple times`,
    inputRegisterOverlap: (r) => `input ${r} is declared more than once`,
    staticRegisterOverlap: (r) => `static register ${r} is declared more than once`,
    staticRegisterOutOfOrder: (r) => `static register ${r} is declared out of order`,
    cycleLengthNotPowerOf2: (s) => `total number of steps is ${s} but must be a power of 2`,
    intervalStepNotCovered: (i) => `step ${i} is not covered by any expression`
};
//# sourceMappingURL=Module.js.map