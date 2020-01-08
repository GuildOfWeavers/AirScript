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
    constructor(name, modulus, registers, constraints, lane) {
        this.name = name;
        this.schema = new air_assembly_1.AirSchema('prime', modulus);
        const steps = lane.cycleLength;
        this.component = this.schema.createComponent(this.name, registers, constraints, steps);
        // build input registers
        const inputMasks = [];
        lane.inputs.forEach((inputGroup, i) => {
            const parent = (i === 0 ? undefined : i - 1); // TODO: handle multiple registers per group
            const steps = (i === lane.inputs.length - 1 ? lane.cycleLength : undefined);
            inputMasks.push(this.component.staticRegisters.length);
            inputGroup.registers.forEach(r => {
                this.component.addInputRegister('public', false, parent, steps, -1);
            });
        });
        this.inputCount = this.component.staticRegisters.length;
        // build input mask and segment control registers
        inputMasks.forEach(m => this.component.addMaskRegister(m, true));
        this.loopCount = inputMasks.length;
        lane.segmentMasks.forEach(m => this.component.addCyclicRegister(m.map(v => BigInt(v))));
        this.segmentCount = lane.segments.length;
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
        return new ExecutionContext_1.ExecutionContext(context, this.inputCount, this.loopCount, this.segmentCount);
    }
    setTransitionFunction(context, initializers, segments) {
        let result;
        let statements = [];
        initializers.forEach(block => {
            statements = statements.concat(block);
            let lastStatement = statements[statements.length - 1];
            let blockResult = context.base.buildLoadExpression(`load.local`, lastStatement.handle);
            if (blockResult.isScalar) {
                blockResult = context.buildMakeVectorExpression([blockResult]);
            }
            result = result ? context.buildBinaryOperation('add', result, blockResult) : blockResult;
        });
        segments.forEach((block, i) => {
            statements = statements.concat(block);
            let lastStatement = statements.pop();
            let control = context.getControlExpression(i);
            let blockResult = context.buildBinaryOperation('mul', lastStatement.expression, control);
            statements.push(context.base.buildStoreOperation(lastStatement.handle, blockResult));
            blockResult = context.base.buildLoadExpression(`load.local`, lastStatement.handle);
            result = result ? context.buildBinaryOperation('add', result, blockResult) : blockResult;
        });
        if (result.isScalar) {
            result = context.buildMakeVectorExpression([result]);
        }
        this.component.setTransitionFunction(context.base, statements, result);
    }
    setConstraintEvaluator(context, statements) {
        let result = statements.pop().expression;
        if (result.isScalar) {
            result = context.buildMakeVectorExpression([result]);
        }
        this.component.setConstraintEvaluator(context.base, statements, result);
    }
}
exports.ModuleContext = ModuleContext;
// HELPER FUNCTIONS
// ================================================================================================
//# sourceMappingURL=ModuleContext.js.map