"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BinaryOperation_1 = require("../operations/BinaryOperation");
const SymbolReference_1 = require("../SymbolReference");
const ExtractElement_1 = require("../vectors/ExtractElement");
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
        // build loop control expressions
        const loopCount = this.inputTemplate.length + this.segmentMasks.length;
        const controlCount = Math.ceil(Math.log2(loopCount)) * 2;
        this.controls = [];
        for (let i = 0; i < controlCount; i++) {
            this.controls.push(buildControlExpression(i, controlCount));
        }
    }
    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get baseCycleLength() {
        return this.segmentMasks[0].length;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    getModifier(controlId) {
        let modifier;
        const key = controlId.toString(2).padStart(this.controls.length / 2, '0');
        if (key) {
            for (let i = 0; i < key.length; i++) {
                let m = (key[i] === '1') ? this.controls[2 * i] : this.controls[2 * i + 1];
                modifier = modifier ? BinaryOperation_1.BinaryOperation.mul(modifier, m) : m;
            }
        }
        return modifier;
    }
    validateConstraintMasks(masks) {
        // TODO
    }
}
exports.LoopController = LoopController;
// HELPER FUNCTIONS
// ================================================================================================
function buildControlExpression(controlId, length) {
    let result = new SymbolReference_1.SymbolReference('c', [length, 0], new Array(length).fill(1n));
    result = new ExtractElement_1.ExtractVectorElement(result, controlId);
    return result;
}
//# sourceMappingURL=LoopController.js.map