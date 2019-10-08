"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const InputLoop_1 = require("./InputLoop");
const SegmentLoopBlock_1 = require("./SegmentLoopBlock");
// CLASS DEFINITION
// ================================================================================================
class LoopController {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(loop) {
        this.inputTemplate = new Array(loop.registers.size).fill(0);
        this.segmentMasks = [];
        // reduce loop expression structure to input template and segment loop masks
        while (true) {
            if (loop.bodyExpression instanceof InputLoop_1.InputLoop) {
                loop = loop.bodyExpression;
                for (let register of loop.registers) {
                    this.inputTemplate[register]++;
                }
            }
            else if (loop.bodyExpression instanceof SegmentLoopBlock_1.SegmentLoopBlock) {
                loop.bodyExpression.masks.forEach(mask => this.segmentMasks.push(mask));
                break;
            }
            else {
                throw Error('TODO');
            }
        }
    }
    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get baseCycleLength() {
        return this.segmentMasks[0].length;
    }
    get LoopCount() {
        return this.inputTemplate.length + this.segmentMasks.length;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    validateConstraintMasks(masks) {
        // TODO
    }
}
exports.LoopController = LoopController;
//# sourceMappingURL=LoopController.js.map