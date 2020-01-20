// IMPORTS
// ================================================================================================
import {
    FiniteField, AirSchema, ProcedureName, Expression, StoreOperation, Dimensions, InputRegisterMaster
} from "@guildofweavers/air-assembly";
import { SymbolInfo, FunctionInfo } from './Module';
import { ExecutionContext } from "./ExecutionContext";
import { CONTROLLER_NAME } from "./utils";

// INTERFACES
// ================================================================================================
export interface InputRegister {
    readonly scope      : string;
    readonly binary     : boolean;
    readonly master?    : InputRegisterMaster;
    readonly steps?     : number;
    readonly loopAnchor : boolean;
}

export interface MaskRegister {
    readonly input  : number;
}

export interface ProcedureSpecs {
    readonly transition: {
        readonly handle : string,
        readonly result : Dimensions;
        readonly params : { name: string, dimensions: Dimensions }[];
    };
    readonly evaluation: {
        readonly handle : string,
        readonly result : Dimensions;
        readonly params : { name: string, dimensions: Dimensions }[];
    };
    readonly inputRegisters         : InputRegister[];
    readonly segmentMasks           : bigint[][];
    readonly staticRegisterOffset   : number;
}

// CLASS DEFINITION
// ================================================================================================
export class Component {

    readonly schema             : AirSchema;
    readonly maskRegisters      : MaskRegister[];

    private readonly procedures : ProcedureSpecs;
    private readonly symbols    : Map<string, SymbolInfo>;
    private readonly functions  : Map<string, FunctionInfo>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(schema: AirSchema, procedures: ProcedureSpecs, symbols: Map<string, SymbolInfo>, functions: Map<string, FunctionInfo>) {
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
    get field(): FiniteField {
        return this.schema.field;
    }

    get transitionFunctionHandle(): string {
        return this.procedures.transition.handle;
    }

    get constraintEvaluatorHandle(): string {
        return this.procedures.evaluation.handle;
    }

    get inputRegisters(): InputRegister[] {
        return this.procedures.inputRegisters;
    }

    get segmentMasks(): bigint[][] {
        return this.procedures.segmentMasks;
    }

    get cycleLength(): number {
        return this.procedures.segmentMasks[0].length;
    }

    get segmentCount(): number {
        return this.procedures.segmentMasks.length;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    createExecutionContext(procedure: ProcedureName): ExecutionContext {
        const specs = (procedure === 'transition')
            ? this.procedures.transition
            : this.procedures.evaluation;

        const context = this.schema.createFunctionContext(specs.result, specs.handle);
        specs.params.forEach(p => context.addParam(p.dimensions, p.name));
        return new ExecutionContext(context, this.symbols, this.functions, {
            loop    : this.inputRegisters.length,
            segment : this.inputRegisters.length + this.maskRegisters.length
        });
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

        initializers.forEach((expression, i) => {
            if (expression.isScalar) {
                expression = context.buildMakeVectorExpression([expression]);
            }
            const resultHandle = `${CONTROLLER_NAME}_${i}`;
            context.base.addLocal(expression.dimensions, resultHandle);

            const resultControl = context.getLoopController(i);
            statements.push(context.base.buildStoreOperation(resultHandle, expression));
            expression = context.base.buildLoadExpression(`load.local`, resultHandle);
            expression = context.buildBinaryOperation('mul', expression, resultControl);

            result = result ? context.buildBinaryOperation('add', result, expression) : expression;
        });

        segments.forEach((expression, i) => {
            const resultHandle = `${CONTROLLER_NAME}${i}`;
            context.base.addLocal(expression.dimensions, resultHandle);

            const resultControl = context.getSegmentController(i);
            expression = context.buildBinaryOperation('mul', expression, resultControl);
            statements.push(context.base.buildStoreOperation(resultHandle, expression));
            expression = context.base.buildLoadExpression(`load.local`, resultHandle);

            result = result ? context.buildBinaryOperation('add', result, expression) : expression;
        });

        return { statements, result: result! };
    }
}