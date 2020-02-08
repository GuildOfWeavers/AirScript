"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ExecutionContext_1 = require("./ExecutionContext");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class Component {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(schema, procedures, symbols) {
        this.schema = schema;
        this.procedures = procedures;
        this.symbols = symbols;
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
    get inputRegisters() {
        return this.procedures.inputRegisters;
    }
    get segmentMasks() {
        return this.procedures.segmentMasks;
    }
    get cycleLength() {
        return this.procedures.segmentMasks[0].length;
    }
    get staticRegisterCount() {
        const param = this.procedures.transition.params.filter(p => p.name === utils_1.ProcedureParams.staticRow)[0];
        return param.dimensions[0];
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    createExecutionContext(procedure) {
        const specs = (procedure === 'transition')
            ? this.procedures.transition
            : this.procedures.evaluation;
        const staticRegisters = {
            inputs: this.inputRegisters.length,
            loops: this.maskRegisters.length,
            segments: this.segmentMasks.length,
            aux: this.staticRegisterCount - this.procedures.auxRegisterOffset
        };
        const context = this.schema.createFunctionContext(specs.result, specs.handle);
        specs.params.forEach(p => context.addParam(p.dimensions, p.name));
        return new ExecutionContext_1.ExecutionContext(context, this.symbols, staticRegisters);
    }
    setTransitionFunction(context) {
        const { statements, result } = this.buildFunction(context);
        this.schema.addFunction(context.base, statements, result);
    }
    setConstraintEvaluator(context, result) {
        if (result) {
            this.schema.addFunction(context.base, context.statements, result);
        }
        else {
            const { statements, result } = this.buildFunction(context);
            this.schema.addFunction(context.base, statements, result);
        }
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    buildFunction(context) {
        let result;
        let statements = context.statements;
        context.initializers.forEach((expression, i) => {
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
        context.segments.forEach((expression, i) => {
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