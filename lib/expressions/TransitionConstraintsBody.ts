// IMPORTS
// ================================================================================================
import { LoopDescriptor } from '@guildofweavers/air-script';
import { Expression } from './Expression';
import { InputLoop } from './loops/InputLoop';
import { getLoopStructure } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class TransitionConstraintsBody extends Expression {

    readonly root           : Expression;
    
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(root: InputLoop, template: LoopDescriptor) {
        if (root.isScalar) {
            super([1, 0], [root.degree as bigint]);
        }
        else if (root.isVector) {
            super(root.dimensions, root.degree);
        }
        else {
            throw new Error(`transition constraints must evaluate to a scalar or to a vector`);
        }
        this.root = root;
        const loopStructure = getLoopStructure(root);
        validateInputLoopStructure(template.traceTemplate, loopStructure.inputTemplate);
        validateSegmentLoopStructure(template.segmentMasks, loopStructure.segmentMasks);
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string): string {
        if (assignTo) throw new Error('transition constraints body cannot be assigned to a variable');

        let code = 'let result;\n';
        code += this.root.toJsCode('result');
        code += this.root.isScalar ? `return [result];\n` : `return result.values;\n`;

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