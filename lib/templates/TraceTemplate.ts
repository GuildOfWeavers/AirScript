// IMPORTS
// ================================================================================================
import { Interval, InputRegister, MaskRegister, SegmentRegister } from "@guildofweavers/air-script";
import { validate } from "../utils";

// CLASS DEFINITION
// ================================================================================================
export interface RegisterSpecs {
    readonly inputs     : InputRegister[];
    readonly masks      : MaskRegister[];
    readonly segments   : SegmentRegister[]
}

export interface TemplateContainer {
    readonly domain     : Interval;
}

// CLASS DEFINITION
// ================================================================================================
export abstract class TraceTemplate {

    readonly domain : Interval;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain: Interval) {
        validate(domain[1] >= domain[0], errors.domainEndBeforeStart(domain));
        this.domain = domain;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get domainWidth(): number {
        return this.domain[1] - this.domain[0] + 1;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    isSubdomainOf(domain: Interval): boolean {
        return (domain[0] <= this.domain[0] && domain[1] >= this.domain[1]);
    }

    isInDomain(index: number): boolean {
        return (this.domain[0] <= index || this.domain[1] >= index);
    }
}

// ERRORS
// ================================================================================================
const errors = {
    domainEndBeforeStart    : (v: any) => `invalid domain [${v}]: domain end is before domain start`
};