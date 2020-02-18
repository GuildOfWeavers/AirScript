// IMPORTS
// ================================================================================================
import { Interval } from "@guildofweavers/air-script";
import { TraceTemplate } from "./TraceTemplate";

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
}