// IMPORTS
// ================================================================================================
import { SymbolInfo, InputInfo, InputRegister, MaskRegister, SegmentRegister, StaticRegister, Interval } from "@guildofweavers/air-script";
import { AirSchema, FiniteField, Dimensions, ProcedureName, Expression, InputRegisterMaster } from "@guildofweavers/air-assembly";
import { LoopTemplate, LoopBaseTemplate } from "./templates";
import { RootContext } from "./contexts";
import { ProcedureParams, TRANSITION_FN_HANDLE, EVALUATION_FN_HANDLE, validate } from "./utils";

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
export class Component {

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
        this.traceWidth = traceWidth;
        this.constraintCount = constraintCount;
        this.symbols = symbols;
        this.inputRegisters = [];
        this.maskRegisters = [];
        this.segmentRegisters = [];
        this.auxRegisters = auxRegisters;

        this.buildRegisterSpecs(template, [0]);
        // TODO: include delegates in cycle length logic
        this.cycleLength = 0;
        for (let segment of this.segmentRegisters) {
            let steps = segment.mask.length;
            //validate(isPowerOf2(steps), errors.cycleLengthNotPowerOf2(steps));
            // TODO: make sure there are no gaps
            if (steps > this.cycleLength) {
                this.cycleLength = steps;
            }
        }
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
        const symbols = transformSymbols(this.symbols, this.traceWidth, this.auxRegisterOffset);
        specs.params.forEach(p => context.addParam(p.dimensions, p.name));
        return new RootContext(domain, context, symbols, staticRegisters);
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

    private buildRegisterSpecs(loop: LoopTemplate, path: number[], masterParent?: InputRegisterMaster): void {
        const inputOffset = this.inputRegisters.length;
        const masterPeer: InputRegisterMaster = { relation: 'peerof', index: inputOffset };
        const cycleLength = loop.cycleLength;

        // build input registers for this loop
        let isAnchor = true;
        for (let inputName of loop.ownInputs) {
            const symbol = this.symbols.get(inputName) as InputInfo;
            validate(symbol !== undefined, errors.undeclaredInput(inputName));
            validate(symbol.type === 'input', errors.invalidLoopInput(inputName));
            validate(symbol.rank === loop.rank, errors.inputRankMismatch(inputName));

            for (let k = 0; k < (symbol.dimensions[0] || 1); k++) {
                this.inputRegisters.push({
                    scope       : symbol.scope,
                    binary      : symbol.binary,
                    master      : isAnchor || loop.isLeaf ? masterParent : masterPeer,
                    steps       : cycleLength
                });
                isAnchor = false;
            }
        }

        // add mask register for the loop
        this.maskRegisters.push({
            input   : inputOffset,
            path    : path
        });

        // recurse down for all child blocks
        const master: InputRegisterMaster = { relation: 'childof', index: masterPeer.index };
        loop.blocks.forEach((block, i) => {
            if (block instanceof LoopTemplate) {
                this.buildRegisterSpecs(block, path.concat(i), master);
            }
            else if (block instanceof LoopBaseTemplate) {
                block.masks.forEach((mask, j) => {
                    this.segmentRegisters.push({ mask, path: path.concat([j])});
                });
            }
            else {
                // TODO: delegate
            }
        });
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

// ERRORS
// ================================================================================================
const errors = {
    undeclaredInput         : (r: any) => `input '${r}' is used without being declared`,
    invalidLoopInput        : (s: any) => `symbol '${s}' cannot be used in loop header`,
    inputRankMismatch       : (s: any) => `rank of input '${s}' does not match loop depth`,
    blockTypeConflict       : (t: any) => `cannot add block of type ${t.name} to loop template`
};