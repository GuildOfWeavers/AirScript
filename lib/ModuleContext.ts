// IMPORTS
// ================================================================================================
import { AirSchema, AirComponent, ProcedureName, StoreOperation, Expression } from "@guildofweavers/air-assembly";
import { TransitionSpecs } from "./TransitionSpecs";
import { ExecutionContext } from "./ExecutionContext";

// CLASS DEFINITION
// ================================================================================================
export class ModuleContext {

    readonly name           : string;
    readonly schema         : AirSchema;
    readonly component      : AirComponent;

    readonly inputCount     : number;
    readonly segmentCount   : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name: string, modulus: bigint, registers: number, constraints: number, specs: TransitionSpecs) {
        this.name = name;
        this.schema = new AirSchema('prime', modulus);

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
    addConstant(name: string, value: bigint | bigint[] | bigint[][]): void {
        //TODO: validateVariableName(name, dimensions);
        this.schema.addConstant(value, `$${name}`);
    }

    addStatic(name: string, values: bigint[]): void {
        // TODO: check name
        this.component.addCyclicRegister(values);
    }

    createExecutionContext(procedure: ProcedureName): ExecutionContext {
        const context = this.component.createProcedureContext(procedure);
        return new ExecutionContext(context, this.inputCount, this.segmentCount);
    }

    setTransitionFunction(context: ExecutionContext, initializers: Expression[], segments: Expression[]): void {
        const { statements, result } = this.buildProcedure(context, initializers, segments);
        this.component.setTransitionFunction(context.base, statements, result);
    }

    setConstraintEvaluator(context: ExecutionContext, initializers: Expression[], segments: Expression[]): void {
        const { statements, result } = this.buildProcedure(context, initializers, segments);
        this.component.setConstraintEvaluator(context.base, statements, result);
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private buildProcedure(context: ExecutionContext, initializers: Expression[], segments: Expression[]) {
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
}

// HELPER FUNCTIONS
// ================================================================================================
