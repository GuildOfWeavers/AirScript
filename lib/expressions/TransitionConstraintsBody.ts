// IMPORTS
// ================================================================================================
import { InputBlockDescriptor } from '@guildofweavers/air-script';
import { Expression } from './Expression';
import { InputBlock } from './loops/InputBlock';
import { getInputBlockStructure } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class TransitionConstraintsBody extends Expression {
    
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(root: Expression, template: InputBlockDescriptor) {
        if (root.isScalar) {
            super([1, 0], [root.degree as bigint], [root]);
        }
        else if (root.isVector) {
            super(root.dimensions, root.degree, [root]);
        }
        else {
            throw new Error(`transition constraints must evaluate to a scalar or to a vector`);
        }

        if (root instanceof InputBlock) {
            const blockStructure = getInputBlockStructure(root);
            validateRegisterDepths(template.registerDepths, blockStructure.registerDepths);
            validateBaseCycleMasks(template.baseCycleMasks, blockStructure.baseCycleMasks);
        }
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get root(): Expression { return this.children[0]; }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string): string {
        if (assignTo) throw new Error('transition constraints body cannot be assigned to a variable');

        let code = 'let result;\n';
        code += this.root.toJsCode('result');
        code += this.root.isScalar ? `return [result];\n` : `return result.toValues();\n`;

        return code;
    }

    toAssembly(): string {
        return `(evaluate ${this.root.toAssembly()})\n`;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function validateRegisterDepths(a: number[], b: number[]): void {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            throw new Error('transition constraints input block structure conflicts with transition function');
        }
    }
}

function validateBaseCycleMasks(a: number[][], b: number[][]): void {
    if (a.length !== b.length) {
        throw new Error('transition constraints input block structure conflicts with transition function');
    }

    for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < a[i].length; j++) {
            if (a[i][j] !== b[i][j]) {
                throw new Error('transition constraints input block structure conflicts with transition function');
            }
        }        
    }
}