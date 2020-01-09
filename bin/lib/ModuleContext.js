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
        specs.loops.forEach((loop, i) => {
            const parent = (i === 0 ? undefined : i - 1); // TODO: handle multiple registers per group
            const steps = (i === specs.loops.length - 1 ? specs.cycleLength : undefined);
            loop.inputs.forEach(r => {
                this.component.addInputRegister('public', false, parent, steps, -1);
            });
        });
        this.inputCount = this.component.staticRegisters.length;
        // build segment control registers
        specs.segmentMasks.forEach(m => this.component.addCyclicRegister(m.map(v => BigInt(v))));
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
    addInput(name, scope, binary = false, parent) {
        // TODO
        //this.component.addInputRegister(scope, binary, undefined, 64);
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