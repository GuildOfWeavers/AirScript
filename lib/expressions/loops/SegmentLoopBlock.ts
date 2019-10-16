// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from '../Expression';
import { areSameDimensions, isPowerOf2 } from '../../utils';
import { SymbolReference } from '../SymbolReference';
import { BinaryOperation } from '../operations/BinaryOperation';
import { maxDegree } from '../utils';
import { SegmentLoop } from './SegmentLoop';

// CLASS DEFINITION
// ================================================================================================
export class SegmentLoopBlock extends Expression {

    readonly loops  : SegmentLoop[];
    readonly masks  : number[][];

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(loops: SegmentLoop[]) {

        // determine dimensions and degree for the block
        const dimensions = loops[0].body.dimensions;
        let degree: ExpressionDegree = 0n;
        for (let loop of loops) {
            degree = maxDegree(loop.degree, degree);

            // make sure all loops have the same dimensions
            if (!areSameDimensions(dimensions, loop.dimensions)) {
                throw new Error('all loop expressions must resolve to values of same dimensions');
            }
        }

        super(dimensions, degree);
        this.loops = loops;
        this.masks = validateMasks(loops);
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string): string {
        if (!assignTo) throw new Error('segment loop block cannot be reduced to unassigned code');
        
        let code = `let ${this.loops.map((loop, i) => `b${i}`).join(', ')};\n`;
        let result!: Expression;
        for (let i = 0; i < this.loops.length; i++) {
            let bVar = `b${i}`, loop = this.loops[i];
            let bRef = new SymbolReference(bVar, loop.dimensions, loop.degree);
            code += `${loop.toJsCode(bVar)}`;
            result = result ? BinaryOperation.add(bRef, result) : bRef;
        }

        code += `${result.toJsCode(assignTo)}`;

        return `{\n${code}}\n`;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function validateMasks(loops: SegmentLoop[]): number[][] {

    let maxSteps = 0;
    const stepSet = new Set<number>();

    // make sure masks don't overlap
    for (let loop of loops) {
        for (let i = 0; i < loop.traceMask.length; i++) {
            if (loop.traceMask[i] === 0) continue;
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

    if (!isPowerOf2(stepCount)) {
        throw new Error('total number of steps must be a power of 2');
    }

    // make sure all masks are of the same length
    const masks: number[][] = [];
    for (let loop of loops) {
        let mask = loop.traceMask;
        if (mask.length < stepCount) {
            mask = mask.concat(new Array(stepCount - mask.length).fill(0))
        }
        masks.push(mask);
    }

    return masks;
}