"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const air_assembly_1 = require("@guildofweavers/air-assembly");
const ExecutionContext_1 = require("./ExecutionContext");
// CLASS DEFINITION
// ================================================================================================
class ModuleContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name, modulus, registers, constraints, specs) {
        this.name = name;
        this.schema = new air_assembly_1.AirSchema('prime', modulus);
        this.registers = registers;
        this.constraints = constraints;
        const steps = specs.cycleLength;
        this.component = this.schema.createComponent(this.name, registers, constraints, steps);
        // build input registers
        specs.inputs2.forEach(i => this.component.addInputRegister(i.scope, i.binary, i.parent, i.steps, -1));
        this.inputCount = specs.inputs.size;
        // build segment control registers
        specs.segments.forEach(s => this.component.addCyclicRegister(s.mask));
        this.segmentCount = specs.segments.length;
        // set trace initializer to return a vector of zeros
        const initContext = this.component.createProcedureContext('init');
        const zeroElement = initContext.buildLiteralValue(this.schema.field.zero);
        const initResult = initContext.buildMakeVectorExpression(new Array(registers).fill(zeroElement));
        this.component.setTraceInitializer(initContext, [], initResult);
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
        let baseContext;
        const functionName = `$${this.name}_${procedure}`;
        const rDimensions = [this.registers, 0];
        const kDimensions = [this.component.staticRegisters.length, 0];
        const cDimensions = [this.constraints, 0];
        if (procedure === 'transition') {
            baseContext = this.schema.createFunctionContext(rDimensions, functionName);
            baseContext.addParam(rDimensions, `$r`);
            baseContext.addParam(kDimensions, `$k`);
        }
        else {
            baseContext = this.schema.createFunctionContext(cDimensions, functionName);
            baseContext.addParam(rDimensions, `$r`);
            baseContext.addParam(rDimensions, `$n`);
            baseContext.addParam(kDimensions, `$k`);
        }
        return new ExecutionContext_1.ExecutionContext(baseContext, this.inputCount, this.segmentCount);
    }
    setTransitionFunction(context, initializers, segments) {
        const { statements, result } = this.buildProcedure(context, initializers, segments);
        this.schema.addFunction(context.base, statements, result);
        const pContext = this.component.createProcedureContext('transition');
        const callExpression = pContext.buildCallExpression(`$${this.name}_transition`, [
            pContext.buildLoadExpression('load.trace', 0),
            pContext.buildLoadExpression('load.static', 0)
        ]);
        this.component.setTransitionFunction(pContext, [], callExpression);
    }
    setConstraintEvaluator(context, initializers, segments) {
        const { statements, result } = this.buildProcedure(context, initializers, segments);
        this.schema.addFunction(context.base, statements, result);
        const pContext = this.component.createProcedureContext('evaluation');
        const callExpression = pContext.buildCallExpression(`$${this.name}_evaluation`, [
            pContext.buildLoadExpression('load.trace', 0),
            pContext.buildLoadExpression('load.trace', 1),
            pContext.buildLoadExpression('load.static', 0)
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
            pContext.buildLoadExpression('load.static', 0)
        ]);
        this.component.setConstraintEvaluator(pContext, [], callExpression);
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    buildProcedure(context, initializers, segments) {
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
}
exports.ModuleContext = ModuleContext;
// HELPER FUNCTIONS
// ================================================================================================
//# sourceMappingURL=ModuleContext.js.map