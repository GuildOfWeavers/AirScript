"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TraceTemplate_1 = require("./TraceTemplate");
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class LoopBaseTemplate extends TraceTemplate_1.TraceTemplate {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain) {
        super(domain);
        this.masks = [];
        this._stepsToIntervals = new Map();
        this._cycleLength = 0;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isComplete() {
        // TODO
        return true;
    }
    get cycleLength() {
        // TODO: check if masks exist?
        return this.masks[0].length;
    }
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    addSegment(intervals) {
        for (let interval of intervals) {
            let start = interval[0], end = interval[1];
            // make sure the interval is valid
            utils_1.validate(start >= 0, errors.intervalStartTooLow(start, end));
            utils_1.validate(end >= start, errors.intervalStartAfterEnd(start, end));
            // make sure the interval does not conflict with previously added intervals
            for (let i = start; i <= end; i++) {
                if (this._stepsToIntervals.has(i)) {
                    utils_1.validate(false, errors.intervalStepOverlap(start, end, this._stepsToIntervals.get(i)));
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
                let filling = new Array(diff).fill(0n); // TODO: this.field.zero
                mask.push(...filling);
            }
        }
        // build the mask
        const mask = new Array(this._cycleLength).fill(0n); // TODO: this.field.zero
        for (let [start, end] of intervals) {
            for (let i = start; i <= end; i++) {
                mask[i] = 1n; // TODO: this.field.one
            }
        }
        // build and add the new segment to the list
        this.masks.push(mask);
    }
    buildRegisterSpecs(registers, symbols, path) {
        this.masks.forEach((mask, i) => {
            registers.segments.push({ mask, path: path.concat([i]) });
        });
    }
}
exports.LoopBaseTemplate = LoopBaseTemplate;
// ERRORS
// ================================================================================================
const errors = {
    inputNotInOuterLoop: (i) => `input ${i} is missing from the outer loop`,
    intervalStartTooLow: (s, e) => `invalid step interval [${s}..${e}]: start index must be greater than 0`,
    intervalStartAfterEnd: (s, e) => `invalid step interval [${s}..${e}]: start index must be smaller than end index`,
    intervalStepOverlap: (s1, e1, i2) => `step interval [${s1}..${e1}] overlaps with interval [${i2[0]}..${i2[1]}]`
};
//# sourceMappingURL=LoopBaseTemplate.js.map