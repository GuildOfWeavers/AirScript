// IMPORTS
// ================================================================================================
import { TraceDomain, InputRegister, MaskRegister, SegmentRegister } from "@guildofweavers/air-script";
import { InputRegisterMaster } from "@guildofweavers/air-assembly";
import { SymbolInfo } from "../Module";

// CLASS DEFINITION
// ================================================================================================
export interface RegisterSpecs {
    readonly inputs     : InputRegister[];
    readonly masks      : MaskRegister[];
    readonly segments   : SegmentRegister[]
}

export interface TemplateContainer {
    readonly domain     : TraceDomain;
}

// CLASS DEFINITION
// ================================================================================================
export abstract class TraceTemplate {

    readonly domain : TraceDomain;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent: TemplateContainer, domain?: TraceDomain) {
        // TODO: validate start/end
        this.domain = domain ? domain : parent.domain;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get domainWidth(): number {
        return this.domain.end - this.domain.start + 1;
    }

    abstract get isComplete(): boolean;

    abstract buildRegisterSpecs(registers: RegisterSpecs, symbols: Map<string, SymbolInfo>, path: number[], parent?: InputRegisterMaster): void;

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    isSubdomainOf(domain: TraceDomain): boolean {
        return (domain.start <= this.domain.start && domain.end >= this.domain.end);
    }

    isInDomain(index: number): boolean {
        return (this.domain.start <= index || this.domain.end >= index);
    }
}