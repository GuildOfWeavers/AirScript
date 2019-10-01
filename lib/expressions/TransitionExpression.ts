// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree, JsCodeOptions } from './Expression';
import { areSameDimensions, isScalar, isPowerOf2 } from '../utils';
import { StatementBlock } from './StatementBlock';
import { SymbolReference } from './SymbolReference';
import { BinaryOperation } from './operations/BinaryOperation';
import { sumDegree, maxDegree } from './utils';
import { LoopController } from './LoopController';

// INTERFACES
// ================================================================================================
export interface TransitionSegment {
    statements  : StatementBlock;
    intervals   : Interval[];
}

type Interval = [number, number];

// CLASS DEFINITION
// ================================================================================================
export class TransitionExpression extends Expression {

    readonly masks  : string[];
    readonly blocks : StatementBlock[];

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(segments: TransitionSegment[]) {

        // determine dimensions and degree of controls
        const dimensions = segments[0].statements.dimensions;
        const controlDegree = BigInt(Math.ceil(Math.log2(segments.length)));
        let degree: ExpressionDegree = isScalar(dimensions)
            ? 0n
            : new Array<bigint>(dimensions[0]).fill(0n);

        // break segments into blocks and interval groups
        const blocks: StatementBlock[] = [];
        const intervalGroups: Interval[][] = [];
        for (let segment of segments) {
            blocks.push(segment.statements);
            intervalGroups.push(segment.intervals);

            // calculate expression degree
            degree = maxDegree(sumDegree(segment.statements.degree, controlDegree), degree);

            // make sure all segments have the same dimensions
            if (!areSameDimensions(dimensions, segment.statements.dimensions)) {
                throw new Error('all loops loop expressions must resolve to values of same dimensions');
            }
        }

        super(dimensions, degree);
        this.masks = normalizeIntervals(intervalGroups);
        this.blocks = blocks;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string, options?: JsCodeOptions, controller?: LoopController): string {
        if (assignTo) throw new Error('transition expression cannot be assigned to a variable');
        if (!controller) throw new Error('transition expression cannot be reduced to code without a loop controller');

        let code = `let ${this.blocks.map((b, i) => `b${i}`).join(', ')};\n`;
        const bResults: Expression[] = [];
        for (let i = 0; i < this.blocks.length; i++) {
            let bVar = `b${i}`, block = this.blocks[i];
            let bRef = new SymbolReference(bVar, block.dimensions, block.degree);
            code += `${this.blocks[i].toJsCode(bVar)}`;
            
            let modifier = controller.getModifier(this.masks[i]);
            bResults.push(modifier ? BinaryOperation.mul(bRef, modifier) : bRef);
        }

        let result: Expression | undefined;
        for (let bResult of bResults) {
            result = result ? BinaryOperation.add(result, bResult) : bResult;
        }

        code += this.isScalar
            ? `return [${result!.toJsCode()}];\n`
            : `return ${result!.toJsCode()}.values;\n`;

        return code;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function normalizeIntervals(intervalGroups: Interval[][]): string[] {

    let maxValue = 0;
    const valueMap = new Map<number, Interval>();

    for (let intervals of intervalGroups) {
        for (let interval of intervals) {
            let start = interval[0], end = interval[1];
            if (start > end) {
                throw new Error(`invalid step interval [${start}..${end}]: start index must be smaller than end index`);
            }

            for (let i = start; i <= end; i++) {
                if (valueMap.has(i)) {
                    const [s2, e2] = valueMap.get(i)!;
                    throw new Error(`step interval [${start}..${end}] overlaps with interval [${s2}..${e2}]`);
                }
                valueMap.set(i, interval);
                if (i > maxValue) {
                    maxValue = i;
                }
            }
        }
    }
    maxValue++;

    if (valueMap.size < maxValue) {
        for (let i = 0; i < maxValue; i++) {
            if (!valueMap.has(i)) {
                throw new Error(`step ${i} is not covered by any expression`);
            }
        }
    }

    if (!isPowerOf2(maxValue)) {
        throw new Error('total number of steps must be a power of 2');
    }

    const masks: string[] = [];
    for (let intervals of intervalGroups) {
        let mask = new Array<number>(maxValue).fill(0);
        for (let [start, end] of intervals) {
            for (let i = start; i <= end; i++) {
                mask[i] = 1;
            }
        }
        masks.push(mask.map(v => v.toString(10)).join(''));
    }

    return masks;
}