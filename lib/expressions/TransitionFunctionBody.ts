// IMPORTS
// ================================================================================================
import { Expression } from './Expression';
import { InputBlock } from './loops/InputBlock';
import { getInputBlockStructure } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class TransitionFunctionBody extends Expression {

    readonly inputBlock     : Expression;
    readonly traceTemplate  : number[];
    readonly segmentMasks   : number[][];

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(inputBlock: InputBlock) {
        if (inputBlock.isScalar) {
            super([1, 0], [inputBlock.degree as bigint]);
        }
        else if (inputBlock.isVector) {
            super(inputBlock.dimensions, inputBlock.degree);
        }
        else {
            throw new Error(`transition function must evaluate to a scalar or to a vector`);
        }
        this.inputBlock = inputBlock;
        const loopStructure = getInputBlockStructure(inputBlock);
        this.traceTemplate = loopStructure.traceTemplate;
        this.segmentMasks = loopStructure.segmentMasks;
    }

    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get baseCycleLength(): number {
        return this.segmentMasks[0].length;
    }

    get LoopCount(): number {
        return this.traceTemplate.length + this.segmentMasks.length;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string): string {
        if (assignTo) throw new Error('transition function body cannot be assigned to a variable');

        let code = 'let result;\n';
        code += this.inputBlock.toJsCode('result');
        code += this.inputBlock.isScalar ? `return [result];\n` : `return result.values;\n`;

        return code;
    }
}