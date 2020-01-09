"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class TransitionSpecs {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor() {
        this.loops = [];
        this.inputs = new Map();
        this.segments = [];
        this._stepsToIntervals = new Map();
        this._cycleLength = 0;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get segmentMasks() {
        return this.segments.map(s => s.mask);
    }
    get cycleLength() {
        return this._cycleLength;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addLoop(inputs, init) {
        this.loops.push({ inputs, init });
        for (let register of inputs) {
            // TODO: validate register
            this.inputs.set(register, undefined);
        }
    }
    addInput(register, scope, binary, parent) {
        let input = this.inputs.get(register);
        if (!input) {
            input = { scope, binary, parent };
            this.inputs.set(register, input);
        }
        else {
            throw new Error(`input register ${register} is defined more than once`);
        }
        /* TODO
        const index = Number(register.slice(2));
        if (index !== this.inputs.size) {
            throw new Error(`input register ${register} is defined out of order`);
        }
        */
    }
    addSegment(intervals, body) {
        for (let interval of intervals) {
            let start = interval[0], end = interval[1];
            // make sure the interval is valid
            if (start < 1) {
                throw new Error(`invalid step interval [${start}..${end}]: start index must be greater than 0`);
            }
            else if (start > end) {
                throw new Error(`invalid step interval [${start}..${end}]: start index must be smaller than end index`);
            }
            // make sure the interval does not conflict with previously added intervals
            for (let i = start; i <= end; i++) {
                if (this._stepsToIntervals.has(i)) {
                    const [s2, e2] = this._stepsToIntervals.get(i);
                    throw new Error(`step interval [${start}..${end}] overlaps with interval [${s2}..${e2}]`);
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
                let filling = new Array(diff).fill(0n);
                segment.mask.push(...filling);
            }
        }
        // build the mask
        const mask = new Array(this._cycleLength).fill(0n);
        for (let [start, end] of intervals) {
            for (let i = start; i <= end; i++) {
                mask[i] = 1n;
            }
        }
        // build and add the new segment to the list
        this.segments.push({ mask, body });
    }
    validate() {
        // make sure masks cover all steps
        if (this._stepsToIntervals.size < this._cycleLength) {
            for (let i = 1; i < this._cycleLength; i++) {
                if (!this._stepsToIntervals.has(i)) {
                    throw new Error(`step ${i} is not covered by any expression`);
                }
            }
        }
        // cycle length must be a power of 2
        if (!utils_1.isPowerOf2(this._cycleLength)) {
            throw new Error('total number of steps must be a power of 2');
        }
        // make sure definitions for all inputs were provided
        for (let [register, input] of this.inputs) {
            if (!input) {
                throw new Error(`input register ${register} is used without being declared`);
            }
        }
    }
}
exports.TransitionSpecs = TransitionSpecs;
//# sourceMappingURL=TransitionSpecs.js.map