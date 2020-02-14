// IMPORTS
// ================================================================================================
import { TraceDomain } from "@guildofweavers/air-script";
import { InputRegisterMaster } from "@guildofweavers/air-assembly";
import { SymbolInfo } from "../Module";
import { InputRegister, MaskRegister, SegmentRegister } from "../Component";

// CLASS DEFINITION
// ================================================================================================
export interface RegisterSpecs {
    readonly inputs     : InputRegister[];
    readonly masks      : MaskRegister[];
    readonly segments   : SegmentRegister[]
}

// CLASS DEFINITION
// ================================================================================================
export abstract class TraceTemplate {

    readonly domain : TraceDomain;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain: TraceDomain) {
        // TODO: validate start/end
        this.domain = domain;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get domainWidth(): number {
        return this.domain.end - this.domain.start + 1;
    }

    abstract get isComplete(): boolean;

    abstract buildRegisterSpecs(registers: RegisterSpecs, symbols: Map<string, SymbolInfo>, path: number[], masterParent?: InputRegisterMaster): void;

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    isSubdomainOf(domain: TraceDomain): boolean {
        return (domain.start <= this.domain.start && domain.end >= this.domain.end);
    }

    isInDomain(index: number): boolean {
        return (this.domain.start <= index || this.domain.end >= index);
    }
}