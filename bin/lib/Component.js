"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ExecutionContext_1 = require("./ExecutionContext");
// CLASS DEFINITION
// ================================================================================================
class Component {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(schema, procedures, symbols, functions) {
        this.schema = schema;
        this.procedures = procedures;
        this.symbols = symbols;
        this.functions = functions;
        this.maskRegisters = [];
        procedures.inputRegisters.forEach((r, i) => {
            if (r.loopAnchor) {
                this.maskRegisters.push({ input: i });
            }
        });
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get field() {
        return this.schema.field;
    }
    get transitionFunctionHandle() {
        return this.procedures.transition.handle;
    }
    get constraintEvaluatorHandle() {
        return this.procedures.evaluation.handle;
    }
    get inputRegisters() {
        return this.procedures.inputRegisters;
    }
    get segmentMasks() {
        return this.procedures.segmentMasks;
    }
    get cycleLength() {
        return this.procedures.segmentMasks[0].length;
    }
    get segmentCount() {
        return this.procedures.segmentMasks.length;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    createExecutionContext(procedure) {
        const specs = (procedure === 'transition')
            ? this.procedures.transition
            : this.procedures.evaluation;
        const context = this.schema.createFunctionContext(specs.result, specs.handle);
        specs.params.forEach(p => context.addParam(p.dimensions, p.name));
        return new ExecutionContext_1.ExecutionContext(context, this.symbols, this.functions, {
            loop: this.inputRegisters.length,
            segment: this.inputRegisters.length + this.maskRegisters.length
        });
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
            const resultHandle = `$_init_${i}`;
            context.base.addLocal(expression.dimensions, resultHandle);
            const resultControl = context.getLoopController(i);
            expression = context.buildBinaryOperation('mul', expression, resultControl);
            statements.push(context.base.buildStoreOperation(resultHandle, expression));
            expression = context.base.buildLoadExpression(`load.local`, resultHandle);
            result = result ? context.buildBinaryOperation('add', result, expression) : expression;
        });
        segments.forEach((expression, i) => {
            const resultHandle = `$_seg_${i}`;
            context.base.addLocal(expression.dimensions, resultHandle);
            const resultControl = context.getSegmentController(i);
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