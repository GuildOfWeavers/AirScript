// IMPORTS
// ================================================================================================
import { AirSchema, ProcedureName, Expression, StoreOperation, Dimensions } from "@guildofweavers/air-assembly";
import { ExecutionContext } from "./ExecutionContext";

// INTERFACES
// ================================================================================================
export interface InputRegister {
    readonly scope  : string;
    readonly binary : boolean;
    readonly parent?: number;
    readonly steps? : number;
}

export interface ProcedureSpecs {
    readonly transition: {
        readonly name   : string,
        readonly result : Dimensions;
        readonly params : { name: string, dimensions: Dimensions }[];
    };
    readonly evaluation: {
        readonly name   : string,
        readonly result : Dimensions;
        readonly params : { name: string, dimensions: Dimensions }[];
    };
}

// CLASS DEFINITION
// ================================================================================================
export class Component {

    readonly schema         : AirSchema;
    readonly procedures     : ProcedureSpecs;
    readonly segmentMasks   : bigint[][];
    readonly inputRegisters : InputRegister[];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(schema: AirSchema, procedures: ProcedureSpecs, segmentMasks: bigint[][], inputRegisters: InputRegister[]) {
        this.schema = schema;
        this.procedures = procedures;
        this.segmentMasks = segmentMasks;
        this.inputRegisters = inputRegisters;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get cycleLength(): number {
        return this.segmentMasks[0].length;
    }

    get segmentCount(): number {
        return this.segmentMasks.length;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    createExecutionContext(procedure: ProcedureName): ExecutionContext {
        const specs = (procedure === 'transition')
            ? this.procedures.transition
            : this.procedures.evaluation;

        
        const context = this.schema.createFunctionContext(specs.result, specs.name);
        specs.params.forEach(p => context.addParam(p.dimensions, p.name));
        return new ExecutionContext(context);
    }

    setTransitionFunction(context: ExecutionContext, initializers: Expression[], segments: Expression[]): void {
        const { statements, result } = this.buildFunction(context, initializers, segments);
        this.schema.addFunction(context.base, statements, result);
    }

    setConstraintEvaluator(context: ExecutionContext, result: Expression): void;
    setConstraintEvaluator(context: ExecutionContext, initializers: Expression[], segments: Expression[]): void
    setConstraintEvaluator(context: ExecutionContext, resultOrInitializer: Expression | Expression[], segments?: Expression[]): void {
        if (Array.isArray(resultOrInitializer)) {
            const { statements, result } = this.buildFunction(context, resultOrInitializer, segments!);
            this.schema.addFunction(context.base, statements, result);
        }
        else {
            this.schema.addFunction(context.base, context.statements, resultOrInitializer);
        }
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
}