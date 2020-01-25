"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class ExecutionTemplate {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(field) {
        this.field = field;
        this.loops = [];
        this.segments = [];
        this._stepsToIntervals = new Map();
        this._cycleLength = 0;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get cycleLength() {
        return this._cycleLength;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addLoop(inputs, init, statements) {
        if (this.loops.length > 0) {
            let outerLoop = this.loops[this.loops.length - 1];
            inputs.forEach(input => {
                utils_1.validate(outerLoop.inputs.has(input), errors.inputNotInOuterLoop(input));
                outerLoop.inputs.delete(input);
            });
        }
        this.loops.push({ inputs: new Set(inputs), init, statements });
    }
    addSegment(intervals, body) {
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
        for (let segment of this.segments) {
            const diff = this._cycleLength - segment.mask.length;
            if (diff > 0) {
                let filling = new Array(diff).fill(this.field.zero);
                segment.mask.push(...filling);
            }
        }
        // build the mask
        const mask = new Array(this._cycleLength).fill(this.field.zero);
        for (let [start, end] of intervals) {
            for (let i = start; i <= end; i++) {
                mask[i] = this.field.one;
            }
        }
        // build and add the new segment to the list
        this.segments.push({ mask, body });
    }
    getIntervalAt(step) {
        return this._stepsToIntervals.get(step);
    }
}
exports.ExecutionTemplate = ExecutionTemplate;
// ERRORS
// ================================================================================================
const errors = {
    inputNotInOuterLoop: (i) => `input ${i} is missing from the outer loop`,
    intervalStartTooLow: (s, e) => `invalid step interval [${s}..${e}]: start index must be greater than 0`,
    intervalStartAfterEnd: (s, e) => `invalid step interval [${s}..${e}]: start index must be smaller than end index`,
    intervalStepOverlap: (s1, e1, i2) => `step interval [${s1}..${e1}] overlaps with interval [${i2[0]}..${i2[1]}]`
};
//# sourceMappingURL=ExecutionTemplate.js.map