// IMPORTS
// ================================================================================================
import { TraceDomain } from "@guildofweavers/air-script";
import { TraceTemplate } from "./TraceTemplate";
import { validate } from "../utils";

// INTERFACES
// ================================================================================================
type Interval = [number, number];

// CLASS DEFINITION
// ================================================================================================
export class LoopBaseTemplate extends TraceTemplate {

    readonly masks              : bigint[][];

    private _stepsToIntervals   : Map<number, Interval>;
    private _cycleLength        : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain: TraceDomain) {
        super(domain);
        this.masks = [];
        this._stepsToIntervals = new Map();
        this._cycleLength = 0;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isComplete(): boolean {
        // TODO
        return true;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    addSegment(intervals: Interval[]): void {
        for (let interval of intervals) {
            let start = interval[0], end = interval[1];

            // make sure the interval is valid
            validate(start >= 0, errors.intervalStartTooLow(start, end));
            validate(end >= start, errors.intervalStartAfterEnd(start, end));
            
            // make sure the interval does not conflict with previously added intervals
            for (let i = start; i <= end; i++) {
                if (this._stepsToIntervals.has(i)) {
                    validate(false, errors.intervalStepOverlap(start, end, this._stepsToIntervals.get(i)!));
                }
                this._stepsToIntervals.set(i, interval);
            }

            // update cycle length
            if (end >= this._cycleLength) {
                this._cycleLength = end + 1;
            }
        }

        // make mask in all other segments have the same length
        for (let mask of this.masks) {
            const diff = this._cycleLength - mask.length;
            if (diff > 0) {
                let filling = new Array<bigint>(diff).fill(0n); // TODO: this.field.zero
                mask.push(...filling);
            }
        }

        // build the mask
        const mask = new Array<bigint>(this._cycleLength).fill(0n); // TODO: this.field.zero
        for (let [start, end] of intervals) {
            for (let i = start; i <= end; i++) {
                mask[i] = 1n; // TODO: this.field.one
            }
        }

        // build and add the new segment to the list
        this.masks.push(mask);
    }
}

// ERRORS
// ================================================================================================
const errors = {
    inputNotInOuterLoop     : (i: any) => `input ${i} is missing from the outer loop`,
    intervalStartTooLow     : (s: any, e: any) => `invalid step interval [${s}..${e}]: start index must be greater than 0`,
    intervalStartAfterEnd   : (s: any, e: any) => `invalid step interval [${s}..${e}]: start index must be smaller than end index`,
    intervalStepOverlap     : (s1: any, e1: any, i2: any[]) => `step interval [${s1}..${e1}] overlaps with interval [${i2[0]}..${i2[1]}]`
};