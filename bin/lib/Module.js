"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const air_assembly_1 = require("@guildofweavers/air-assembly");
const path = require("path");
const Component_1 = require("./Component");
const utils_1 = require("./utils");
const importer_1 = require("./importer");
// CLASS DEFINITION
// ================================================================================================
class Module {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name, basedir, modulus, traceWidth, constraintCount) {
        this.name = name;
        this.basedir = basedir;
        this.schema = new air_assembly_1.AirSchema('prime', modulus);
        this.traceWidth = traceWidth;
        this.constraintCount = constraintCount;
        this.auxRegisters = [];
        this.symbols = new Map();
        this.inputRegisterCount = 0;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get field() {
        return this.schema.field;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addImport(filePath, members) {
        // try to load the AirAssembly module specified by the file path
        const schema = loadSchema(this.basedir, filePath);
        // copy constants and functions
        const constOffset = importer_1.importConstants(schema, this.schema);
        const funcOffset = importer_1.importFunctions(schema, this.schema, constOffset);
        // extract members
        members.forEach(member => {
            const component = schema.components.get(member.member);
            utils_1.validate(component !== undefined, errors.componentNotFound(member.member, filePath));
            let auxRegisterOffset = this.auxRegisters.length;
            component.staticRegisters.forEach(register => {
                if (utils_1.isCyclicRegister(register)) {
                    this.auxRegisters.push({ values: register.values });
                }
            });
            const offsets = {
                constants: constOffset,
                functions: funcOffset,
                auxRegisters: auxRegisterOffset,
                auxRegisterCount: this.auxRegisters.length
            };
            const symbols = importer_1.importComponent(component, this.schema, offsets, member.alias);
            symbols.forEach(s => this.symbols.set(s.handle.substr(1), s));
        });
    }
    addConstant(name, value) {
        utils_1.validateSymbolName(name);
        utils_1.validate(!this.symbols.has(name), errors.dupSymbolDeclaration(name));
        const handle = `$${name}`;
        const index = this.schema.constants.length;
        this.schema.addConstant(value, handle);
        const dimensions = this.schema.constants[index].dimensions;
        this.symbols.set(name, { type: 'const', handle, dimensions, subset: false });
    }
    addInput(name, width, rank, scope, binary) {
        utils_1.validate(!this.symbols.has(name), errors.dupSymbolDeclaration(name));
        utils_1.validate(width > 0, errors.invalidInputWidth(name));
        const offset = this.inputRegisterCount;
        this.inputRegisterCount = offset + width;
        const dimensions = width === 1 ? [0, 0] : [width, 0];
        this.symbols.set(name, { type: 'input', handle: name, offset, dimensions, subset: true, scope, binary, rank });
    }
    addStatic(name, values) {
        utils_1.validate(!this.symbols.has(name), errors.dupSymbolDeclaration(name));
        const index = this.auxRegisters.length;
        values.forEach((v => this.auxRegisters.push({ values: v })));
        const dimensions = values.length === 1 ? [0, 0] : [values.length, 0];
        this.symbols.set(name, { type: 'static', handle: name, offset: index, dimensions, subset: true });
    }
    createComponent(template) {
        return new Component_1.Component(this.schema, this.traceWidth, this.constraintCount, template, this.symbols, this.auxRegisters);
    }
    setComponent(component, componentName) {
        // create component object
        const c = this.schema.createComponent(componentName, this.traceWidth, this.constraintCount, component.cycleLength);
        // add static registers to the component
        component.inputRegisters.forEach(r => c.addInputRegister(r.scope, r.binary, r.master, r.steps, -1));
        component.maskRegisters.forEach(r => c.addMaskRegister(r.input, false));
        component.segmentRegisters.forEach(r => {
            // rotate the mask by one position to the left, to align it with input position
            const mask = r.mask.slice();
            mask.push(mask.shift());
            c.addCyclicRegister(mask);
        });
        this.auxRegisters.forEach(r => c.addCyclicRegister(r.values));
        // set trace initializer to return a result of applying transition function to a vector of all zeros
        const initContext = c.createProcedureContext('init');
        const initParams = this.buildProcedureParams(initContext);
        const initCall = initContext.buildCallExpression(utils_1.TRANSITION_FN_HANDLE, initParams);
        c.setTraceInitializer(initContext, [], initCall);
        // set transition function procedure to call transition function
        const tfContext = c.createProcedureContext('transition');
        const tfParams = this.buildProcedureParams(tfContext);
        const tfCall = tfContext.buildCallExpression(utils_1.TRANSITION_FN_HANDLE, tfParams);
        c.setTransitionFunction(tfContext, [], tfCall);
        // set constraint evaluator procedure to call constraint evaluator function
        const evContext = c.createProcedureContext('evaluation');
        const evParams = this.buildProcedureParams(evContext);
        const evCall = evContext.buildCallExpression(utils_1.EVALUATION_FN_HANDLE, evParams);
        c.setConstraintEvaluator(evContext, [], evCall);
        // add component to the schema
        this.schema.addComponent(c);
    }
    // HELPER METHODS
    // --------------------------------------------------------------------------------------------
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
}
exports.Module = Module;
// HELPER FUNCTIONS
// ================================================================================================
function loadSchema(basedir, filePath) {
    if (!path.isAbsolute(filePath)) {
        filePath = path.resolve(basedir, filePath);
    }
    try {
        return air_assembly_1.compile(filePath);
    }
    catch (error) {
        throw new Error(`cannot not import from '${filePath}': ${error.message}`);
    }
}
// ERRORS
// ================================================================================================
const errors = {
    componentNotFound: (c, p) => `component ${c} does not exit in the specified module at ${p}`,
    undeclaredInput: (r) => `input '${r}' is used without being declared`,
    overusedInput: (r) => `input '${r}' cannot resurface in inner loops`,
    invalidLoopInput: (s) => `symbol '${s}' cannot be used in loop header`,
    invalidInputWidth: (s) => `input '${s}' is invalid: input width must be greater than 0`,
    inputRankMismatch: (s) => `rank of input '${s}' does not match loop depth`,
    dupSymbolDeclaration: (s) => `symbol '${s}' is declared multiple times`,
    cycleLengthNotPowerOf2: (s) => `total number of steps is ${s} but must be a power of 2`,
    intervalStepNotCovered: (i) => `step ${i} is not covered by any expression`
};
//# sourceMappingURL=Module.js.map