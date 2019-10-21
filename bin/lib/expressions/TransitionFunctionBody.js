"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class TransitionFunctionBody extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(inputBlock) {
        if (inputBlock.isScalar) {
            super([1, 0], [inputBlock.degree], [inputBlock]);
        }
        else if (inputBlock.isVector) {
            super(inputBlock.dimensions, inputBlock.degree, [inputBlock]);
        }
        else {
            throw new Error(`transition function must evaluate to a scalar or to a vector`);
        }
        const blockStructure = utils_1.getInputBlockStructure(inputBlock);
        this.inputRegisterSpecs = blockStructure.registerDepths;
        this.baseCycleMasks = blockStructure.baseCycleMasks;
    }
    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get inputBlock() { return this.children[0]; }
    get baseCycleLength() {
        return this.baseCycleMasks[0].length;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo) {
        if (assignTo)
            throw new Error('transition function body cannot be assigned to a variable');
        let code = 'let result;\n';
        code += this.inputBlock.toJsCode('result');
        code += this.inputBlock.isScalar ? `return [result];\n` : `return result.toValues();\n`;
        return code;
    }
    toAssembly() {
        return `(transition ${this.inputBlock.toAssembly()})\n`;
    }
}
exports.TransitionFunctionBody = TransitionFunctionBody;
//# sourceMappingURL=TransitionFunctionBody.js.map