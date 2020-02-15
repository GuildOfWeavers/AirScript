// IMPORTS
// ================================================================================================
import { RegisterSpecs } from "./TraceTemplate";
import { LoopTemplate } from "./LoopTemplate";
import { SymbolInfo } from "../Module";

// CLASS DEFINITION
// ================================================================================================
export class ExecutionTemplate {

    readonly registers: RegisterSpecs;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(root: LoopTemplate, symbols: Map<string, SymbolInfo>) {
        this.registers = { inputs: [], masks: [], segments: [] };
        root.buildRegisterSpecs(this.registers, symbols, [0]);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get cycleLength(): number {
        // TODO
        return this.registers.segments[0].mask.length;
    }

    get auxRegisterOffset(): number {
        return this.registers.inputs.length
            + this.registers.masks.length
            + this.registers.segments.length;
    }
}