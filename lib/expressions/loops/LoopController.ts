// IMPORTS
// ================================================================================================
import { Expression } from "../Expression";
import { BinaryOperation } from "../operations/BinaryOperation";
import { SymbolReference } from "../SymbolReference";
import { ExtractVectorElement } from "../vectors/ExtractElement";
import { InputLoop } from "./InputLoop";
import { SegmentLoopBlock } from "./SegmentLoopBlock";

// CLASS DEFINITION
// ================================================================================================
export class LoopController {

    readonly inputTemplate  : number[];
    readonly segmentMasks   : number[][];
    readonly controls       : Expression[];
    
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
    get baseCycleLength(): number {
        return this.segmentMasks[0].length;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    getModifier(controlId: number): Expression | undefined {
        let modifier: Expression | undefined;

        const key = controlId.toString(2).padStart(this.controls.length / 2, '0');
        if (key) {
            for (let i = 0; i < key.length; i++) {
                let m = (key[i] === '1') ? this.controls[2 * i] : this.controls[2 * i + 1];
                modifier = modifier ? BinaryOperation.mul(modifier, m) : m;
            }
        }

        return modifier;
    }

    validateConstraintMasks(masks: string[]): void {
        // TODO
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function buildControlExpression(controlId: number, length: number): Expression {
    let result: Expression = new SymbolReference('c', [length, 0], new Array(length).fill(1n));
    result = new ExtractVectorElement(result, controlId);
    return result;
}