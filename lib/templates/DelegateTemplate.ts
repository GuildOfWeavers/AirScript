// IMPORTS
// ================================================================================================
import { Interval, SymbolInfo } from "@guildofweavers/air-script";
import { TraceTemplate, RegisterSpecs } from "./TraceTemplate";

// CLASS DEFINITION
// ================================================================================================
export class DelegateTemplate extends TraceTemplate {

    readonly delegate: string;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain: Interval, delegate: string) {
        super(domain);
        this.delegate = delegate;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isComplete(): boolean {
        return true;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    buildRegisterSpecs(registers: RegisterSpecs, symbols: Map<string, SymbolInfo>, path: number[]): void {
        // TODO
    }
}