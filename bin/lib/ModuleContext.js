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
        const context = this.component.createProcedureContext(procedure);
        return new ExecutionContext_1.ExecutionContext(context, this.inputCount, this.segmentCount);
    }
    setTransitionFunction(context, initializers, segments) {
        const { statements, result } = this.buildProcedure(context, initializers, segments);
        this.component.setTransitionFunction(context.base, statements, result);
    }
    setConstraintEvaluator(context, initializers, segments) {
        const { statements, result } = this.buildProcedure(context, initializers, segments);
        this.component.setConstraintEvaluator(context.base, statements, result);
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