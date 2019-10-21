// IMPORTS
// ================================================================================================
import { Expression } from './Expression';
import { InputBlock } from './loops/InputBlock';
import { getInputBlockStructure } from './utils';

// CLASS DEFINITION
// ================================================================================================
export class TransitionFunctionBody extends Expression {

    readonly inputRegisterSpecs : number[];
    readonly baseCycleMasks     : number[][];

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(inputBlock: InputBlock) {
        if (inputBlock.isScalar) {
            super([1, 0], [inputBlock.degree as bigint], [inputBlock]);
        }
        else if (inputBlock.isVector) {
            super(inputBlock.dimensions, inputBlock.degree, [inputBlock]);
        }
        else {
            throw new Error(`transition function must evaluate to a scalar or to a vector`);
        }
        const blockStructure = getInputBlockStructure(inputBlock);
        this.inputRegisterSpecs = blockStructure.registerDepths;
        this.baseCycleMasks = blockStructure.baseCycleMasks;
    }

    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get inputBlock(): Expression { return this.children[0]; }
    
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

    toAssembly(): string {
        return `(transition ${this.inputBlock.toAssembly()})\n`;
    }
}