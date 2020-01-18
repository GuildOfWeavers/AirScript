"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ExecutionContext_1 = require("./ExecutionContext");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class Component {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(schema, procedures, segmentMasks, inputRegisters, loopDrivers) {
        this.schema = schema;
        this.procedures = procedures;
        this.loopDrivers = loopDrivers;
        this.segmentMasks = segmentMasks;
        this.inputRegisters = inputRegisters;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get field() {
        return this.schema.field;
    }
    get cycleLength() {
        return this.segmentMasks[0].length;
    }
    get segmentCount() {
        return this.segmentMasks.length;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    createExecutionContext(procedure) {
        const specs = (procedure === 'transition')
            ? this.procedures.transition
            : this.procedures.evaluation;
        const context = this.schema.createFunctionContext(specs.result, specs.name);
        specs.params.forEach(p => context.addParam(p.dimensions, p.name));
        return new ExecutionContext_1.ExecutionContext(context, this.procedures, this.loopDrivers.length);
    }
    setTransitionFunction(context, initializers, segments) {
        const { statements, result } = this.buildFunction(context, initializers, segments);
        this.schema.addFunction(context.base, statements, result);
    }
    setConstraintEvaluator(context, resultOrInitializer, segments) {
        if (Array.isArray(resultOrInitializer)) {
            const { statements, result } = this.buildFunction(context, resultOrInitializer, segments);
            this.schema.addFunction(context.base, statements, result);
        }
        else {
            this.schema.addFunction(context.base, context.statements, resultOrInitializer);
        }
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    buildFunction(context, initializers, segments) {
        let result;
        let statements = context.statements;
        initializers.forEach((expression, i) => {
            if (expression.isScalar) {
                expression = context.buildMakeVectorExpression([expression]);
            }
            const resultHandle = `${utils_1.CONTROLLER_NAME}_${i}`;
            context.base.addLocal(expression.dimensions, resultHandle);
            statements.push(context.base.buildStoreOperation(resultHandle, expression));
            expression = context.base.buildLoadExpression(`load.local`, resultHandle);
            const resultControl = context.getLoopController(i);
            expression = context.buildBinaryOperation('mul', expression, resultControl);
            result = result ? context.buildBinaryOperation('add', result, expression) : expression;
        });
        segments.forEach((expression, i) => {
            const resultHandle = `${utils_1.CONTROLLER_NAME}${i}`;
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
exports.Component = Component;
//# sourceMappingURL=Component.js.map