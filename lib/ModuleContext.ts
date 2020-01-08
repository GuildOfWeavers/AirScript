// IMPORTS
// ================================================================================================
import { AirSchema, AirComponent, ProcedureName, StoreOperation, Expression } from "@guildofweavers/air-assembly";
import { ExecutionLane } from "./ExecutionLane";
import { ExecutionContext } from "./ExecutionContext";

// CLASS DEFINITION
// ================================================================================================
export class ModuleContext {

    readonly name               : string;
    readonly schema             : AirSchema;
    readonly component          : AirComponent;

    readonly inputCount     : number;
    readonly loopCount      : number;
    readonly segmentCount   : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name: string, modulus: bigint, registers: number, constraints: number, lane: ExecutionLane) {
        this.name = name;
        this.schema = new AirSchema('prime', modulus);

        const steps = lane.cycleLength;
        this.component = this.schema.createComponent(this.name, registers, constraints, steps);

        // build input registers
        const inputMasks: number[] = [];
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
    addConstant(name: string, value: bigint | bigint[] | bigint[][]): void {
        //TODO: validateVariableName(name, dimensions);
        this.schema.addConstant(value, `$${name}`);
    }

    addInput(name: string, scope: string, binary = false, parent?: string): void {
        // TODO
        //this.component.addInputRegister(scope, binary, undefined, 64);
    }

    addStatic(name: string, values: bigint[]): void {
        // TODO: check name
        this.component.addCyclicRegister(values);
    }

    createExecutionContext(procedure: ProcedureName): ExecutionContext {
        const context = this.component.createProcedureContext(procedure);
        return new ExecutionContext(context, this.inputCount, this.loopCount, this.segmentCount);
    }

    setTransitionFunction(context: ExecutionContext, initializers: StoreOperation[][], segments: StoreOperation[][]): void {
        
        let result: Expression | undefined;
        let statements: StoreOperation[] = [];

        initializers.forEach(block => {
            statements = statements.concat(block);
            let lastStatement = statements[statements.length - 1];
            let blockResult: Expression = context.base.buildLoadExpression(`load.local`, lastStatement.handle!);
            if (blockResult.isScalar) {
                blockResult = context.buildMakeVectorExpression([blockResult]);
            }
            result = result ? context.buildBinaryOperation('add', result, blockResult) : blockResult;
        });

        segments.forEach((block, i) => {
            statements = statements.concat(block);
            let lastStatement = statements.pop()!;

            let control = context.getControlExpression(i);
            let blockResult: Expression = context.buildBinaryOperation('mul', lastStatement.expression, control);
            statements.push(context.base.buildStoreOperation(lastStatement.handle!, blockResult));

            blockResult = context.base.buildLoadExpression(`load.local`, lastStatement.handle!);
            result = result ? context.buildBinaryOperation('add', result, blockResult) : blockResult;
        });
        
        if (result!.isScalar) {
            result = context.buildMakeVectorExpression([result!]);
        }
        this.component.setTransitionFunction(context.base, statements, result!);
    }

    setConstraintEvaluator(context: ExecutionContext, statements: StoreOperation[]): void {
        let result = statements.pop()!.expression;
        if (result.isScalar) {
            result = context.buildMakeVectorExpression([result]);
        }
        this.component.setConstraintEvaluator(context.base, statements, result);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
