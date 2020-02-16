// IMPORTS
// ================================================================================================
import { SymbolInfo, InputRegister, MaskRegister, SegmentRegister, StaticRegister, Interval } from "@guildofweavers/air-script";
import { AirSchema, FiniteField, Dimensions, ProcedureName, Expression } from "@guildofweavers/air-assembly";
import { LoopTemplate } from "./templates";
import { RootContext } from "./contexts";
import { ProcedureParams, TRANSITION_FN_HANDLE, EVALUATION_FN_HANDLE } from "./utils";

// CLASS DEFINITION
// ================================================================================================
export interface StaticRegisterCounts {
    readonly inputs     : number;
    readonly loops      : number;
    readonly segments   : number;
    readonly aux        : number;
}

interface ProcedureSpecs {
    readonly handle : string,
    readonly result : Dimensions;
    readonly params : { name: string, dimensions: Dimensions }[];
}

// CLASS DEFINITION
// ================================================================================================
export class Component2 {

    readonly schema             : AirSchema;
    readonly symbols            : Map<string, SymbolInfo>;

    readonly cycleLength        : number;

    readonly inputRegisters     : InputRegister[];
    readonly maskRegisters      : MaskRegister[];
    readonly segmentRegisters   : SegmentRegister[];
    readonly auxRegisters       : StaticRegister[];

    readonly traceWidth         : number;
    readonly constraintCount    : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(schema: AirSchema, traceWidth: number, constraintCount: number, template: LoopTemplate, symbols: Map<string, SymbolInfo>, auxRegisters: StaticRegister[]) {
        this.schema = schema;
        this.inputRegisters = [];
        this.maskRegisters = [];
        this.segmentRegisters = [];
        this.auxRegisters = auxRegisters;
        this.traceWidth = traceWidth;
        this.constraintCount = constraintCount;

        this.cycleLength = 0; // TODO
        this.symbols = transformSymbols(symbols, traceWidth, this.auxRegisterOffset);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get field(): FiniteField {
        return this.schema.field;
    }

    get loopRegisterOffset(): number {
        return this.inputRegisters.length;
    }

    get segmentRegisterOffset(): number {
        return this.inputRegisters.length
            + this.maskRegisters.length
            + this.segmentRegisters.length;
    }

    get auxRegisterOffset(): number {
        return this.inputRegisters.length
            + this.maskRegisters.length
            + this.segmentRegisters.length;
    }

    get staticRegisterCount(): number {
        return this.inputRegisters.length
            + this.maskRegisters.length
            + this.segmentRegisters.length
            + this.auxRegisters.length;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    createExecutionContext(procedure: ProcedureName): RootContext {

        const specs = this.getProcedureSpecs(procedure);
        const domain: Interval = [0, this.traceWidth];
        const staticRegisters: StaticRegisterCounts = {
            inputs  : this.inputRegisters.length,
            loops   : this.maskRegisters.length,
            segments: this.segmentRegisters.length,
            aux     : this.auxRegisters.length
        };

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

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private getProcedureSpecs(procedure: ProcedureName): ProcedureSpecs {
        if (procedure === 'transition') {
            return {
                handle  : TRANSITION_FN_HANDLE,
                result  : [this.traceWidth, 0],
                params  : [
                    { name: ProcedureParams.thisTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: ProcedureParams.staticRow,    dimensions: [this.staticRegisterCount, 0] }
                ]
            };
        }
        else if (procedure === 'evaluation') {
            return {
                handle  : EVALUATION_FN_HANDLE,
                result  : [this.constraintCount, 0],
                params  : [
                    { name: ProcedureParams.thisTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: ProcedureParams.nextTraceRow, dimensions: [this.traceWidth, 0] },
                    { name: ProcedureParams.staticRow,    dimensions: [this.staticRegisterCount, 0] }
                ]
            }
        }
        else {
            throw new Error(`cannot build specs for '${procedure}' procedure`);
        }
    }

    private buildRegisterSpecs() {
        // TODO
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function transformSymbols(symbols: Map<string, SymbolInfo>, traceWidth: number, staticOffset: number): Map<string, SymbolInfo> {
    const result = new Map<string, SymbolInfo>();
    const type = 'param' as 'param';

    // transform custom symbols
    for (let [symbol, info] of symbols) {
        if (info.type === 'const' || info.type === 'func') {
            result.set(symbol, info);
        }
        else if (info.type === 'input') {
            result.set(symbol, { ...info, type, handle: ProcedureParams.staticRow });
        }
        else if (info.type === 'static') {
            let offset = info.offset! + staticOffset;
            result.set(symbol, { ...info, type, handle: ProcedureParams.staticRow, offset });
        }
        else {
            throw new Error(`cannot transform ${info.type} symbol to component form`);
        }
    }

    // create symbols for trace rows
    let dimensions = [traceWidth, 0] as Dimensions;
    let subset = false;
    result.set('$r', { type, handle: ProcedureParams.thisTraceRow, dimensions, subset });
    result.set('$n', { type, handle: ProcedureParams.nextTraceRow, dimensions, subset });

    // create symbols for trace registers
    dimensions = [0, 0];
    subset = true;
    for (let i = 0; i < traceWidth; i++) {
        result.set(`$r${i}`, { type, handle: ProcedureParams.thisTraceRow, offset: i, dimensions, subset });
        result.set(`$n${i}`, { type, handle: ProcedureParams.nextTraceRow, offset: i, dimensions, subset });
    }

    return result;
}