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
        this.cycleLength = validateIntervals(intervalGroups);
        this.controls = buildControls(intervalGroups, this.cycleLength);
        this.blocks = blocks;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo) {
        if (assignTo)
            throw new Error('transition block cannot be assigned to a variable');
        let code = ``;
        const tModifiers = [], fModifiers = [];
        for (let i = 0; i < this.controls.length; i++) {
            let tRef = `c[${i}]`, fRef = `fc${i}`;
            tModifiers.push(new SymbolReference_1.SymbolReference(tRef, [0, 0], 1n));
            fModifiers.push(new SymbolReference_1.SymbolReference(fRef, [0, 0], 1n));
            code += `let ${BinaryOperation_1.BinaryOperation.sub(ONE, tModifiers[i]).toJsCode(fRef)}`;
        }
        code += `let ${this.blocks.map((b, i) => `b${i}`).join(', ')};\n`;
        const bResults = [];
        for (let i = 0; i < this.blocks.length; i++) {
            let bVar = `b${i}`, block = this.blocks[i];
            let bRef = new SymbolReference_1.SymbolReference(bVar, block.dimensions, block.degree);
            code += `${this.blocks[i].toJsCode(bVar)}`;
            let modifier;
            for (let j = 0; j < this.controls.length; j++) {
                let m = (i & (1 << j)) ? tModifiers[j] : fModifiers[j];
                modifier = modifier ? BinaryOperation_1.BinaryOperation.mul(modifier, m) : m;
            }
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
function buildControls(intervalGroups, cycleLength) {
    const controlCount = Math.ceil(Math.log2(intervalGroups.length));
    const controls = new Array(controlCount);
    for (let i = 0; i < controlCount; i++) {
        controls[i] = new Array(cycleLength);
    }
    let mask = 0;
    for (let intervals of intervalGroups) {
        for (let [start, end] of intervals) {
            for (let i = start; i <= end; i++) {
                let maskString = mask.toString(2).padStart(controlCount, '0');
                for (let j = 0; j < controlCount; j++) {
                    controls[j][i] = BigInt(maskString.charAt(j));
                }
            }
        }
        mask++;
    }
    return controls;
}
function validateIntervals(intervalGroups) {
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
    return maxValue;
}
//# sourceMappingURL=TransitionExpression.js.map