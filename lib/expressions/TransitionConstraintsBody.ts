// IMPORTS
// ================================================================================================
import { InputBlockDescriptor } from '@guildofweavers/air-script';
import { Expression } from './Expression';
import { InputBlock } from './loops/InputBlock';
import { getInputBlockStructure } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class TransitionConstraintsBody extends Expression {

    readonly inputBlock : Expression;
    
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(inputBlock: InputBlock, template: InputBlockDescriptor) {
        if (inputBlock.isScalar) {
            super([1, 0], [inputBlock.degree as bigint]);
        }
        else if (inputBlock.isVector) {
            super(inputBlock.dimensions, inputBlock.degree);
        }
        else {
            throw new Error(`transition constraints must evaluate to a scalar or to a vector`);
        }
        this.inputBlock = inputBlock;
        const loopStructure = getInputBlockStructure(inputBlock);
        validateInputLoopStructure(template.traceTemplate, loopStructure.traceTemplate);
        validateSegmentLoopStructure(template.segmentMasks, loopStructure.segmentMasks);
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string): string {
        if (assignTo) throw new Error('transition constraints body cannot be assigned to a variable');

        let code = 'let result;\n';
        code += this.inputBlock.toJsCode('result');
        code += this.inputBlock.isScalar ? `return [result];\n` : `return result.values;\n`;

        return code;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function validateInputLoopStructure(a: number[], b: number[]): void {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            throw new Error('TODO: inconsistent loop structure');
        }
    }
}

function validateSegmentLoopStructure(a: number[][], b: number[][]): void {
    if (a.length !== b.length) {
        throw new Error('TODO: inconsistent loop structure');
    }

    for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < a[i].length; j++) {
            if (a[i][j] !== b[i][j]) {
                throw new Error('TODO: inconsistent loop structure');
            }
        }        
    }
}