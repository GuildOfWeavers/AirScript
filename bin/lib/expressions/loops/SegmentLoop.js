"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
const SymbolReference_1 = require("../SymbolReference");
const BinaryOperation_1 = require("../operations/BinaryOperation");
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class SegmentLoop extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(body, intervals, controller) {
        const degree = utils_1.sumDegree(body.degree, controller.degree);
        super(body.dimensions, degree, [controller, body]);
        this.traceMask = parseIntervals(intervals);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get controller() { return this.children[0]; }
    get body() { return this.children[1]; }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo, options) {
        if (!assignTo)
            throw new Error('segment loop cannot be reduced to unassigned code');
        let code = this.body.toJsCode(assignTo);
        // apply control modifier
        const resRef = new SymbolReference_1.SymbolReference(assignTo, this.body.dimensions, this.body.degree);
        code += BinaryOperation_1.BinaryOperation.mul(resRef, this.controller).toJsCode(assignTo, options);
        return code;
    }
    toAssembly() {
        return `(mul ${this.body.toAssembly()} ${this.controller.toAssembly()})\n`;
    }
}
exports.SegmentLoop = SegmentLoop;
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
//# sourceMappingURL=SegmentLoop.js.map