// IMPORTS
// ================================================================================================
import { InputLoop } from "./InputLoop";
import { SegmentLoopBlock } from "./SegmentLoopBlock";

// CLASS DEFINITION
// ================================================================================================
export class LoopController {

    readonly inputTemplate  : number[];
    readonly segmentMasks   : number[][];
    
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(loop: InputLoop) {

        this.inputTemplate = new Array<number>(loop.registers.size).fill(0);
        this.segmentMasks = [];

        // reduce loop expression structure to input template and segment loop masks
        while (true) {
            if (loop.bodyExpression instanceof InputLoop) {
                loop = loop.bodyExpression;
                for (let register of loop.registers) {
                    this.inputTemplate[register]++;
                }
            }
            else if (loop.bodyExpression instanceof SegmentLoopBlock) {
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
    get baseCycleLength(): number {
        return this.segmentMasks[0].length;
    }

    get LoopCount(): number {
        return this.inputTemplate.length + this.segmentMasks.length;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    validateConstraintMasks(masks: string[]): void {
        // TODO
    }
}