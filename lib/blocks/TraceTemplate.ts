// IMPORTS
// ================================================================================================
import { TraceDomain } from "@guildofweavers/air-script";

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

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    isSubdomainOf(domain: TraceDomain): boolean {
        return (domain.start <= this.domain.start && domain.end >= this.domain.end);
    }

    isInDomain(index: number): boolean {
        return (this.domain.start <= index || this.domain.end >= index);
    }
}