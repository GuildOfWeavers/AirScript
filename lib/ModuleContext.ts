// IMPORTS
// ================================================================================================
import {
    AirSchema, AirComponent, ProcedureName, StoreOperation, Expression, Dimensions, ProcedureContext
} from "@guildofweavers/air-assembly";
import { TransitionSpecs } from "./TransitionSpecs";
import { ExecutionContext } from "./ExecutionContext";
import { RegisterRefs } from "./utils";

// CLASS DEFINITION
// ================================================================================================
export class ModuleContext {

    readonly name                   : string;
    readonly schema                 : AirSchema;
    readonly component              : AirComponent;

    private readonly dimensionMap   : Map<string, Dimensions>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name: string, modulus: bigint, traceRegisters: number, staticRegisters: number, constraints: number, specs: TransitionSpecs) {
        this.name = name;
        this.schema = new AirSchema('prime', modulus);

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
        this.dimensionMap.set(RegisterRefs.CurrentState, [traceRegisters, 0]);
        this.dimensionMap.set(RegisterRefs.NextState, [traceRegisters, 0]);
        this.dimensionMap.set(RegisterRefs.Inputs, [specs._inputRegisters.size, 0]);
        this.dimensionMap.set(RegisterRefs.Segments, [specs.segments.length, 0]);
        this.dimensionMap.set(RegisterRefs.Static, [staticRegisters, 0]);
        this.dimensionMap.set('constraints', [constraints, 0]);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addConstant(name: string, value: bigint | bigint[] | bigint[][]): void {
        //TODO: validateVariableName(name, dimensions);
        this.schema.addConstant(value, `$${name}`);
    }

    addStatic(name: string, values: bigint[]): void {
        // TODO: check name
        this.component.addCyclicRegister(values);
    }

    createExecutionContext(procedure: ProcedureName): ExecutionContext {
        let resultDimensions: Dimensions, registerParams: string[];
        if (procedure === 'transition') {
            resultDimensions = this.dimensionMap.get(RegisterRefs.CurrentState)!;
            registerParams = [
                RegisterRefs.CurrentState, RegisterRefs.Inputs, RegisterRefs.Segments
            ];
        }
        else {
            resultDimensions = this.dimensionMap.get('constraints')!;
            registerParams = [
                RegisterRefs.CurrentState, RegisterRefs.NextState, RegisterRefs.Inputs, RegisterRefs.Segments
            ];
        }
        
        if (this.dimensionMap.has(RegisterRefs.Static)) {
            registerParams.push(RegisterRefs.Static);
        }

        const baseContext = this.schema.createFunctionContext(resultDimensions, `$${this.name}_${procedure}`);
        registerParams.forEach(r => baseContext.addParam(this.dimensionMap.get(r)!, r));
        return new ExecutionContext(baseContext);
    }

    setTransitionFunction(context: ExecutionContext, initializers: Expression[], segments: Expression[]): void {
        const { statements, result } = this.buildFunction(context, initializers, segments);
        this.schema.addFunction(context.base, statements, result);

        const pContext = this.component.createProcedureContext('transition');
        const callExpression = pContext.buildCallExpression(`$${this.name}_transition`, [
            pContext.buildLoadExpression('load.trace', 0),
            ...this.buildStaticParamExpressions(pContext)
        ]);
        this.component.setTransitionFunction(pContext, [], callExpression);
    }

    setConstraintEvaluator(context: ExecutionContext, initializers: Expression[], segments: Expression[]): void {
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
    setConstraintEvaluator2(context: ExecutionContext, result: Expression): void {
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
    private buildFunction(context: ExecutionContext, initializers: Expression[], segments: Expression[]) {
        let result: Expression | undefined;
        let statements: StoreOperation[] = context.statements;

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

        return { statements, result: result! };
    }

    private buildStaticParamExpressions(context: ProcedureContext): Expression[] {
        const params: Expression[] = [];

        let dimensions = this.dimensionMap.get(RegisterRefs.Inputs)!;
        let startIdx = 0, endIdx = dimensions[0] - 1;
        let loadExpression = context.buildLoadExpression('load.static', 0);
        params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));

        dimensions = this.dimensionMap.get(RegisterRefs.Segments)!
        startIdx = endIdx + 1;
        endIdx = startIdx + dimensions[0] - 1;
        loadExpression = context.buildLoadExpression('load.static', 0);
        params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));

        dimensions = this.dimensionMap.get(RegisterRefs.Static)!
        if (dimensions) {
            startIdx = endIdx + 1;
            endIdx = startIdx + dimensions[0] - 1;
            loadExpression = context.buildLoadExpression('load.static', 0);
            params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));
        }

        return params;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
