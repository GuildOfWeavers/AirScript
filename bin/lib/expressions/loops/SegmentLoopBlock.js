"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
const utils_1 = require("../../utils");
const SymbolReference_1 = require("../SymbolReference");
const BinaryOperation_1 = require("../operations/BinaryOperation");
const utils_2 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class SegmentLoopBlock extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(loops) {
        // determine dimensions and degree for the block
        const dimensions = loops[0].body.dimensions;
        let degree = 0n;
        for (let loop of loops) {
            degree = utils_2.maxDegree(loop.degree, degree);
            // make sure all loops have the same dimensions
            if (!utils_1.areSameDimensions(dimensions, loop.dimensions)) {
                throw new Error('all loop expressions must resolve to values of same dimensions');
            }
        }
        super(dimensions, degree);
        this.loops = loops;
        this.masks = validateMasks(loops);
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo) {
        if (!assignTo)
            throw new Error('segment loop block cannot be reduced to unassigned code');
        let code = `let ${this.loops.map((loop, i) => `b${i}`).join(', ')};\n`;
        let result;
        for (let i = 0; i < this.loops.length; i++) {
            let bVar = `b${i}`, loop = this.loops[i];
            let bRef = new SymbolReference_1.SymbolReference(bVar, loop.dimensions, loop.degree);
            code += `${loop.toJsCode(bVar)}`;
            result = result ? BinaryOperation_1.BinaryOperation.add(bRef, result) : bRef;
        }
        code += `${result.toJsCode(assignTo)}`;
        return `{\n${code}}\n`;
    }
    toAssembly() {
        let code = this.loops[0].toAssembly();
        for (let i = 1; i < this.loops.length; i++) {
            code = `(add ${code} ${this.loops[i].toAssembly()})`;
        }
        return code;
    }
}
exports.SegmentLoopBlock = SegmentLoopBlock;
// HELPER FUNCTIONS
// ================================================================================================
function validateMasks(loops) {
    let maxSteps = 0;
    const stepSet = new Set();
    // make sure masks don't overlap
    for (let loop of loops) {
        for (let i = 0; i < loop.traceMask.length; i++) {
            if (loop.traceMask[i] === 0)
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
    const masks = [];
    for (let loop of loops) {
        let mask = loop.traceMask;
        if (mask.length < stepCount) {
            mask = mask.concat(new Array(stepCount - mask.length).fill(0));
        }
        masks.push(mask);
    }
    return masks;
}
//# sourceMappingURL=SegmentLoopBlock.js.map