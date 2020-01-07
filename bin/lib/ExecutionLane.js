"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class ExecutionLane {
    constructor() {
        this.inputs = [];
        this.segments = [];
    }
    get segmentMasks() {
        const masks = this.segments.map(s => s.traceMask);
        return validateMasks(masks);
    }
    get cycleLength() {
        // TODO: return based on masks
        return 64;
    }
    addInputs(registers, initializer) {
        this.inputs.push({ registers, initializer });
    }
    addSegment(intervals, body) {
        this.segments.push({ traceMask: parseIntervals(intervals), body });
    }
}
exports.ExecutionLane = ExecutionLane;
// HELPER FUNCTIONS
// ================================================================================================
function parseIntervals(intervals) {
    let maxSteps = 0;
    const stepMap = new Map();
    for (let interval of intervals) {
        let start = interval[0], end = interval[1];
        if (start < 1) {
            throw new Error(`invalid step interval [${start}..${end}]: start index must be greater than 0`);
        }
        else if (start > end) {
            throw new Error(`invalid step interval [${start}..${end}]: start index must be smaller than end index`);
        }
        for (let i = start; i <= end; i++) {
            if (stepMap.has(i)) {
                const [s2, e2] = stepMap.get(i);
                throw new Error(`step interval [${start}..${end}] overlaps with interval [${s2}..${e2}]`);
            }
            stepMap.set(i, interval);
            if (i > maxSteps) {
                maxSteps = i;
            }
        }
    }
    const mask = new Array(maxSteps + 1).fill(0);
    for (let [start, end] of intervals) {
        for (let i = start; i <= end; i++) {
            mask[i] = 1;
        }
    }
    return mask;
}
function validateMasks(masks) {
    let maxSteps = 0;
    const stepSet = new Set();
    // make sure masks don't overlap
    for (let mask of masks) {
        for (let i = 0; i < mask.length; i++) {
            if (mask[i] === 0)
                continue;
            if (stepSet.has(i)) {
                throw new Error(`step ${i} is covered by multiple loops`);
            }
            stepSet.add(i);
            if (i > maxSteps) {
                maxSteps = i;
            }
        }
    }
    // make sure masks cover all steps
    const stepCount = maxSteps + 1;
    if (stepSet.size < stepCount - 1) {
        for (let i = 1; i < stepCount; i++) {
            if (!stepSet.has(i)) {
                throw new Error(`step ${i} is not covered by any expression`);
            }
        }
    }
    if (!utils_1.isPowerOf2(stepCount)) {
        throw new Error('total number of steps must be a power of 2');
    }
    // make sure all masks are of the same length
    const result = [];
    for (let mask of masks) {
        if (mask.length < stepCount) {
            mask = mask.concat(new Array(stepCount - mask.length).fill(0));
        }
        result.push(mask);
    }
    return result;
}
//# sourceMappingURL=ExecutionLane.js.map