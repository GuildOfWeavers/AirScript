// IMPORTS
// ================================================================================================
import { Expression } from './Expression';
import { InputLoop } from './loops/InputLoop';
import { getLoopStructure } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class TransitionConstraintsBody extends Expression {

    readonly root           : Expression;
    
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(root: InputLoop) {
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
        // TODO: validate loop structure
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