// IMPORTS
// ================================================================================================
import {
    FiniteField, AirSchema, ProcedureName, Expression, StoreOperation, Dimensions, InputRegisterMaster
} from "@guildofweavers/air-assembly";
import { SymbolInfo, FunctionInfo } from './Module';
import { RootContext } from "./contexts";
import { ProcedureParams } from "./utils";
import { TraceDomain } from "@guildofweavers/air-script";

// INTERFACES
// ================================================================================================
export interface InputRegister {
    readonly scope      : string;
    readonly binary     : boolean;
    readonly master?    : InputRegisterMaster;
    readonly steps?     : number;
    readonly loopAnchor?: boolean;
}

export interface MaskRegister {
    readonly input  : number;
    readonly path?  : number[];
}

export interface SegmentRegister {
    readonly values : bigint[];
    readonly path   : number[];
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
    readonly inputRegisters     : InputRegister[];
    readonly segmentMasks       : bigint[][];
    readonly auxRegisterOffset  : number;
}

export interface StaticRegisterCounts {
    readonly inputs     : number;
    readonly loops      : number;
    readonly segments   : number;
    readonly aux        : number;
}

// CLASS DEFINITION
// ================================================================================================
export class Component {

    readonly schema             : AirSchema;
    readonly maskRegisters      : MaskRegister[];

    private readonly procedures : ProcedureSpecs;
    private readonly symbols    : Map<string, SymbolInfo>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(schema: AirSchema, procedures: ProcedureSpecs, symbols: Map<string, SymbolInfo>) {
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
    get field(): FiniteField {
        return this.schema.field;
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

    get staticRegisterCount(): number {
        const param = this.procedures.transition.params.filter(p => p.name === ProcedureParams.staticRow)[0];
        return param.dimensions[0];
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    createExecutionContext(procedure: ProcedureName): RootContext {
        const specs = (procedure === 'transition')
            ? this.procedures.transition
            : this.procedures.evaluation;

        const staticRegisters: StaticRegisterCounts = {
            inputs  : this.inputRegisters.length,
            loops   : this.maskRegisters.length,
            segments: this.segmentMasks.length,
            aux : this.staticRegisterCount - this.procedures.auxRegisterOffset
        };

        const traceWidth = this.procedures.transition.result[0];
        const domain: TraceDomain = { start: 0, end: traceWidth };

        const context = this.schema.createFunctionContext(specs.result, specs.handle);
        specs.params.forEach(p => context.addParam(p.dimensions, p.name));
        return new RootContext(domain, context, this.symbols, staticRegisters);
    }

    setTransitionFunction(context: RootContext, result: Expression): void {
        this.schema.addFunction(context.base, context.statements, result);
    }

    setConstraintEvaluator(context: RootContext, result: Expression): void {
        this.schema.addFunction(context.base, context.statements, result);
    }
}