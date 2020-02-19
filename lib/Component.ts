// IMPORTS
// ================================================================================================
import { SymbolInfo, InputInfo, InputRegister, MaskRegister, SegmentRegister, StaticRegister, Interval } from "@guildofweavers/air-script";
import { AirSchema, FiniteField, Dimensions, ProcedureName, Expression, InputRegisterMaster } from "@guildofweavers/air-assembly";
import { LoopTemplate, LoopBaseTemplate, DelegateTemplate } from "./templates";
import { RootContext } from "./contexts";
import { ProcedureParams, TRANSITION_FN_HANDLE, EVALUATION_FN_HANDLE, validate, isFunctionInfoSymbol, isInputInfoSymbol } from "./utils";

// INTERFACES
// ================================================================================================
export interface StaticRegisters {
    readonly inputs     : InputRegister[];
    readonly loops      : MaskRegister[];
    readonly segments   : SegmentRegister[];
    readonly aux        : StaticRegister[];
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

    private inputRankMap        : Map<string, number>;

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

        this.inputRankMap = extractInputs(symbols);
        this.cycleLength = this.buildRegisterSpecs(template, [0]);
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
        const staticRegisters: StaticRegisters = {
            inputs  : this.inputRegisters,
            loops   : this.maskRegisters,
            segments: this.segmentRegisters,
            aux     : this.auxRegisters
        };

        const context = this.schema.createFunctionContext(specs.result, specs.handle);
        const symbols = transformSymbols(this.symbols, this.traceWidth, this.auxRegisterOffset);
        specs.params.forEach(p => context.addParam(p.dimensions, p.name));
        return new RootContext(domain, context, symbols, this.inputRankMap, staticRegisters);
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

    private buildRegisterSpecs(loop: LoopTemplate, path: number[], masterParent?: InputRegisterMaster): number {
        const loopDepth = loop.getDepth(this.inputRankMap);
        if (loopDepth === 0) {
            return this.processLeafLoop(loop, path, masterParent);
        }

        // build input registers for this loop
        const inputOffset = this.inputRegisters.length;
        const masterPeer: InputRegisterMaster = { relation: 'peerof', index: inputOffset };
        let isAnchor = true;

        for (let inputName of loop.ownInputs) {
            const symbol = this.symbols.get(inputName);
            validate(symbol !== undefined, errors.undeclaredInput(inputName));
            validate(isInputInfoSymbol(symbol), errors.invalidLoopInput(inputName));
            validate(symbol.rank === loop.rank, errors.inputRankMismatch(inputName));
            for (let k = 0; k < (symbol.dimensions[0] || 1); k++) {
                this.inputRegisters.push({
                    scope       : symbol.scope,
                    binary      : symbol.binary,
                    master      : isAnchor ? masterParent : masterPeer
                });
                isAnchor = false;
            }
        }

        // add mask register for the loop
        this.maskRegisters.push({
            input   : inputOffset,
            path    : path
        });

        // process all inner loops
        let cycleLength = 0;
        const master: InputRegisterMaster = { relation: 'childof', index: masterPeer.index };
        loop.blocks.forEach((block, i) => {
            // TODO: add support for delegate calls in higher-level loops
            validate(block instanceof LoopTemplate, errors.nonLeafDelegNotSupported());
            const cl = this.buildRegisterSpecs(block, path.concat(i), master);
            if (cl > cycleLength) {
                cycleLength = cl;
            }
        });

        return cycleLength;
    }

    private processLeafLoop(loop: LoopTemplate, path: number[], master?: InputRegisterMaster): number {

        // process inner blocks of the loop and determine cycle length
        let cycleLength: number | undefined;
        loop.blocks.forEach((block, i) => {
            if (block instanceof LoopBaseTemplate) {
                if (cycleLength === undefined) {
                    cycleLength = block.cycleLength;
                }
                validate(cycleLength === block.cycleLength, errors.cycleLengthMismatch());
                block.masks.forEach((mask, j) => {
                    this.segmentRegisters.push({ mask, path: path.concat([j])});
                });
            }
            else if (block instanceof DelegateTemplate) {
                // TODO: find a way to get delegate info without hard-coding name
                const delegate = this.symbols.get(`${block.delegate}_transition`);
                validate(delegate !== undefined, errors.undeclaredDelegate(block.delegate));
                validate(isFunctionInfoSymbol(delegate), errors.invalidDelegate(block.delegate));
                validate(delegate.rank === 0, errors.delegateRankMismatch(block.delegate));
                if (cycleLength === undefined) {
                    cycleLength = delegate.cycleLength;
                }
                validate(cycleLength === delegate.cycleLength, errors.cycleLengthMismatch());
            }
            else {
                throw new Error(`invalid block detected within a leaf loop`);
            }
        });
        validate(cycleLength !== undefined, 'cycle length could not be determined');

        // process block inputs
        const inputOffset = this.inputRegisters.length;
        for (let inputName of loop.ownInputs) {
            const symbol = this.symbols.get(inputName) as InputInfo;
            validate(symbol !== undefined, errors.undeclaredInput(inputName));
            validate(symbol.type === 'input', errors.invalidLoopInput(inputName));
            validate(symbol.rank === loop.rank, errors.inputRankMismatch(inputName));
            for (let k = 0; k < (symbol.dimensions[0] || 1); k++) {
                this.inputRegisters.push({
                    scope       : symbol.scope,
                    binary      : symbol.binary,
                    master      : master,
                    steps       : cycleLength
                });
            }
        }

        // add mask register for the loop
        this.maskRegisters.push({
            input   : inputOffset,
            path    : path
        });

        return cycleLength;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function extractInputs(symbols: Map<string, SymbolInfo>): Map<string, number> {
    const inputs = new Map<string, number>();
    for (let [symbol, info] of symbols) {
        if (isInputInfoSymbol(info)) {
            inputs.set(symbol, info.rank);
        }
    }
    return inputs;
}

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
    blockTypeConflict       : (t: any) => `cannot add block of type ${t.name} to loop template`,
    undeclaredDelegate      : (d: any) => `function '${d}' is used without being imported`,
    invalidDelegate         : (s: any) => `symbol '${s}' is not a function`,
    delegateRankMismatch    : (d: any) => `rank of function '${d}' does not match loop depth`,
    nonLeafDelegNotSupported: () => `function calls in non-leaf input loops are not yet supported`,
    cycleLengthMismatch     : () => `all domains within an input loop must have the same cycle length`
};