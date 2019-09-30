"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const utils_1 = require("../utils");
const SymbolReference_1 = require("./SymbolReference");
const BinaryOperation_1 = require("./operations/BinaryOperation");
const utils_2 = require("./utils");
// MODULE VARIABLES
// ================================================================================================
const ONE = new SymbolReference_1.SymbolReference('f.one', [0, 0], 0n);
// CLASS DEFINITION
// ================================================================================================
class TransitionExpression extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(segments) {
        // determine dimensions and degree of controls
        const dimensions = segments[0].statements.dimensions;
        const controlDegree = BigInt(Math.ceil(Math.log2(segments.length)));
        let degree = utils_1.isScalar(dimensions)
            ? 0n
            : new Array(dimensions[0]).fill(0n);
        // break segments into blocks and interval groups
        const blocks = [];
        const intervalGroups = [];
        for (let segment of segments) {
            blocks.push(segment.statements);
            intervalGroups.push(segment.intervals);
            // calculate expression degree
            degree = utils_2.maxDegree(utils_2.sumDegree(segment.statements.degree, controlDegree), degree);
            // make sure all segments have the same dimensions
            if (!utils_1.areSameDimensions(dimensions, segment.statements.dimensions)) {
                throw new Error('TODO');
            }
        }
        super(dimensions, degree);
        this.masks = normalizeIntervals(intervalGroups);
        this.blocks = blocks;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo, options, controller) {
        if (assignTo)
            throw new Error('transition block cannot be assigned to a variable');
        if (!controller)
            throw new Error('TODO');
        let code = `let ${this.blocks.map((b, i) => `b${i}`).join(', ')};\n`;
        const bResults = [];
        for (let i = 0; i < this.blocks.length; i++) {
            let bVar = `b${i}`, block = this.blocks[i];
            let bRef = new SymbolReference_1.SymbolReference(bVar, block.dimensions, block.degree);
            code += `${this.blocks[i].toJsCode(bVar)}`;
            let modifier = controller.getModifier(this.masks[i]);
            bResults.push(modifier ? BinaryOperation_1.BinaryOperation.mul(bRef, modifier) : bRef);
        }
        let result;
        for (let bResult of bResults) {
            result = result ? BinaryOperation_1.BinaryOperation.add(result, bResult) : bResult;
        }
        code += this.isScalar
            ? `return [${result.toJsCode()}];\n`
            : `return ${result.toJsCode()}.values;\n`;
        return code;
    }
}
exports.TransitionExpression = TransitionExpression;
// HELPER FUNCTIONS
// ================================================================================================
function normalizeIntervals(intervalGroups) {
    let maxValue = 0;
    const valueMap = new Map();
    for (let intervals of intervalGroups) {
        for (let interval of intervals) {
            let start = interval[0], end = interval[1];
            if (start > end) {
                throw new Error(`range error`); // TODO: better error message
            }
            for (let i = start; i <= end; i++) {
                if (valueMap.has(i)) {
                    throw new Error(`range error`); // TODO: better error message
                }
                valueMap.set(i, interval);
                if (i > maxValue) {
                    maxValue = i;
                }
            }
        }
    }
    if (valueMap.size <= maxValue) {
        throw new Error(`range error`); // TODO: better error message
    }
    const masks = [];
    for (let intervals of intervalGroups) {
        let mask = new Array(maxValue + 1).fill(0);
        for (let [start, end] of intervals) {
            for (let i = start; i <= end; i++) {
                mask[i] = 1;
            }
        }
        masks.push(mask.map(v => v.toString(10)).join(''));
    }
    return masks;
}
//# sourceMappingURL=TransitionExpression.js.map