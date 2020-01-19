// IMPORTS
// ================================================================================================
import { FiniteField } from "@guildofweavers/galois";
import { validate } from "./utils";

// INTERFACES
// ================================================================================================
type Interval = [number, number];

interface Segment {
    readonly mask   : bigint[];
    readonly body   : any;
}

interface Loop {
    readonly inputs : Set<string>;
    readonly driver : number;
    readonly init   : any;
}

// CLASS DEFINITION
// ================================================================================================
export class ExecutionTemplate {
    
    readonly field              : FiniteField;
    readonly loops              : Loop[];
    readonly segments           : Segment[];

    private _stepsToIntervals   : Map<number, Interval>;
    private _cycleLength        : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(field: FiniteField) {
        this.field = field;
        this.loops = [];
        this.segments = [];
        this._stepsToIntervals = new Map();
        this._cycleLength = 0;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get cycleLength(): number {
        return this._cycleLength;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addLoop(inputs: string[], init: any): void {
        let driverIdx = 0;
        if (this.loops.length > 0) {
            let outerLoop = this.loops[this.loops.length - 1];
            inputs.forEach(input => {
                validate(outerLoop.inputs.has(input), errors.inputNotInOuterLoop(input));
                outerLoop.inputs.delete(input);
            });
            driverIdx = outerLoop.driver + outerLoop.inputs.size;
        }
        this.loops.push({ inputs: new Set(inputs), driver: driverIdx, init });
    }

    addSegment(intervals: Interval[], body: any): void {

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
        for (let segment of this.segments) {
            const diff = this._cycleLength - segment.mask.length;
            if (diff > 0) {
                let filling = new Array<bigint>(diff).fill(this.field.zero);
                segment.mask.push(...filling);
            }
        }

        // build the mask
        const mask = new Array<bigint>(this._cycleLength).fill(this.field.zero);
        for (let [start, end] of intervals) {
            for (let i = start; i <= end; i++) {
                mask[i] = this.field.one;
            }
        }

        // build and add the new segment to the list
        this.segments.push({ mask, body });
    }

    getIntervalAt(step: number): Interval | undefined {
        return this._stepsToIntervals.get(step);
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