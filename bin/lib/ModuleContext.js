"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const air_assembly_1 = require("@guildofweavers/air-assembly");
const ExecutionContext_1 = require("./ExecutionContext");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class ModuleContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name, modulus, traceRegisters, staticRegisters, constraints, specs) {
        this.name = name;
        this.schema = new air_assembly_1.AirSchema('prime', modulus);
        const steps = specs.cycleLength;
        this.component = this.schema.createComponent(this.name, traceRegisters, constraints, steps);
        // build input and segment control registers
        specs.inputs.forEach(i => this.component.addInputRegister(i.scope, i.binary, i.parent, i.steps, -1));
        specs.segments.forEach(s => this.component.addCyclicRegister(s.mask));
        // set trace initializer to return a vector of zeros
        const initContext = this.component.createProcedureContext('init');
        const zeroElement = initContext.buildLiteralValue(this.schema.field.zero);
        const initResult = initContext.buildMakeVectorExpression(new Array(traceRegisters).fill(zeroElement));
        this.component.setTraceInitializer(initContext, [], initResult);
        // compute dimensions for all trace segments and constraints
        this.dimensionMap = new Map();
        this.dimensionMap.set(utils_1.RegisterRefs.CurrentState, [traceRegisters, 0]);
        this.dimensionMap.set(utils_1.RegisterRefs.NextState, [traceRegisters, 0]);
        this.dimensionMap.set(utils_1.RegisterRefs.Inputs, [specs._inputRegisters.size, 0]);
        this.dimensionMap.set(utils_1.RegisterRefs.Segments, [specs.segments.length, 0]);
        this.dimensionMap.set(utils_1.RegisterRefs.Static, [staticRegisters, 0]);
        this.dimensionMap.set('constraints', [constraints, 0]);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addConstant(name, value) {
        //TODO: validateVariableName(name, dimensions);
        this.schema.addConstant(value, `$${name}`);
    }
    addStatic(name, values) {
        // TODO: check name
        this.component.addCyclicRegister(values);
    }
    createExecutionContext(procedure) {
        let resultDimensions, registerParams;
        if (procedure === 'transition') {
            resultDimensions = this.dimensionMap.get(utils_1.RegisterRefs.CurrentState);
            registerParams = [
                utils_1.RegisterRefs.CurrentState, utils_1.RegisterRefs.Inputs, utils_1.RegisterRefs.Segments
            ];
        }
        else {
            resultDimensions = this.dimensionMap.get('constraints');
            registerParams = [
                utils_1.RegisterRefs.CurrentState, utils_1.RegisterRefs.NextState, utils_1.RegisterRefs.Inputs, utils_1.RegisterRefs.Segments
            ];
        }
        if (this.dimensionMap.has(utils_1.RegisterRefs.Static)) {
            registerParams.push(utils_1.RegisterRefs.Static);
        }
        const baseContext = this.schema.createFunctionContext(resultDimensions, `$${this.name}_${procedure}`);
        registerParams.forEach(r => baseContext.addParam(this.dimensionMap.get(r), r));
        return new ExecutionContext_1.ExecutionContext(baseContext);
    }
    setTransitionFunction(context, initializers, segments) {
        const { statements, result } = this.buildFunction(context, initializers, segments);
        this.schema.addFunction(context.base, statements, result);
        const pContext = this.component.createProcedureContext('transition');
        const callExpression = pContext.buildCallExpression(`$${this.name}_transition`, [
            pContext.buildLoadExpression('load.trace', 0),
            ...this.buildStaticParamExpressions(pContext)
        ]);
        this.component.setTransitionFunction(pContext, [], callExpression);
    }
    setConstraintEvaluator(context, initializers, segments) {
        const { statements, result } = this.buildFunction(context, initializers, segments);
        this.schema.addFunction(context.base, statements, result);
        const pContext = this.component.createProcedureContext('evaluation');
        const callExpression = pContext.buildCallExpression(`$${this.name}_evaluation`, [
            pContext.buildLoadExpression('load.trace', 0),
            pContext.buildLoadExpression('load.trace', 1),
            ...this.buildStaticParamExpressions(pContext)
        ]);
        this.component.setConstraintEvaluator(pContext, [], callExpression);
    }
    // TODO: use better name
    setConstraintEvaluator2(context, result) {
        this.schema.addFunction(context.base, context.statements, result);
        const pContext = this.component.createProcedureContext('evaluation');
        const callExpression = pContext.buildCallExpression(`$${this.name}_evaluation`, [
            pContext.buildLoadExpression('load.trace', 0),
            pContext.buildLoadExpression('load.trace', 1),
            ...this.buildStaticParamExpressions(pContext)
        ]);
        this.component.setConstraintEvaluator(pContext, [], callExpression);
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    buildFunction(context, initializers, segments) {
        let result;
        let statements = context.statements;
        initializers.forEach(expression => {
            if (expression.isScalar) {
                expression = context.buildMakeVectorExpression([expression]);
            }
            result = result ? context.buildBinaryOperation('add', result, expression) : expression;
        });
        segments.forEach((expression, i) => {
            const resultHandle = `$s${i}`;
            context.base.addLocal(expression.dimensions, resultHandle);
            const resultControl = context.getSegmentModifier(i);
            expression = context.buildBinaryOperation('mul', expression, resultControl);
            statements.push(context.base.buildStoreOperation(resultHandle, expression));
            expression = context.base.buildLoadExpression(`load.local`, resultHandle);
            result = result ? context.buildBinaryOperation('add', result, expression) : expression;
        });
        return { statements, result: result };
    }
    buildStaticParamExpressions(context) {
        const params = [];
        let dimensions = this.dimensionMap.get(utils_1.RegisterRefs.Inputs);
        let startIdx = 0, endIdx = dimensions[0] - 1;
        let loadExpression = context.buildLoadExpression('load.static', 0);
        params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));
        dimensions = this.dimensionMap.get(utils_1.RegisterRefs.Segments);
        startIdx = endIdx + 1;
        endIdx = startIdx + dimensions[0] - 1;
        loadExpression = context.buildLoadExpression('load.static', 0);
        params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));
        dimensions = this.dimensionMap.get(utils_1.RegisterRefs.Static);
        if (dimensions) {
            startIdx = endIdx + 1;
            endIdx = startIdx + dimensions[0] - 1;
            loadExpression = context.buildLoadExpression('load.static', 0);
            params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));
        }
        return params;
    }
}
exports.ModuleContext = ModuleContext;
// HELPER FUNCTIONS
// ================================================================================================
//# sourceMappingURL=ModuleContext.js.map