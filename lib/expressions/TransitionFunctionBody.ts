// IMPORTS
// ================================================================================================
import { Expression } from './Expression';
import { InputBlock } from './loops/InputBlock';
import { getInputBlockStructure } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class TransitionFunctionBody extends Expression {

    readonly inputBlock     : Expression;
    readonly registerDepths : number[];
    readonly baseCycleMasks : number[][];

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
        const blockStructure = getInputBlockStructure(inputBlock);
        this.registerDepths = blockStructure.registerDepths;
        this.baseCycleMasks = blockStructure.baseCycleMasks;
    }

    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get baseCycleLength(): number {
        return this.baseCycleMasks[0].length;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string): string {
        if (assignTo) throw new Error('transition function body cannot be assigned to a variable');

        let code = 'let result;\n';
        code += this.inputBlock.toJsCode('result');
        code += this.inputBlock.isScalar ? `return [result];\n` : `return result.toValues();\n`;

        return code;
    }
}