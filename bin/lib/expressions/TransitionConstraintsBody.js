"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Expression_1 = require("./Expression");
const InputBlock_1 = require("./loops/InputBlock");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class TransitionConstraintsBody extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(root, template) {
        if (root.isScalar) {
            super([1, 0], [root.degree], [root]);
        }
        else if (root.isVector) {
            super(root.dimensions, root.degree, [root]);
        }
        else {
            throw new Error(`transition constraints must evaluate to a scalar or to a vector`);
        }
        if (root instanceof InputBlock_1.InputBlock) {
            const blockStructure = utils_1.getInputBlockStructure(root);
            validateRegisterDepths(template.registerDepths, blockStructure.registerDepths);
            validateBaseCycleMasks(template.baseCycleMasks, blockStructure.baseCycleMasks);
        }
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get root() { return this.children[0]; }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo) {
        if (assignTo)
            throw new Error('transition constraints body cannot be assigned to a variable');
        let code = 'let result;\n';
        code += this.root.toJsCode('result');
        code += this.root.isScalar ? `return [result];\n` : `return result.toValues();\n`;
        return code;
    }
    toAssembly() {
        return `(evaluate ${this.root.toAssembly()})\n`;
    }
}
exports.TransitionConstraintsBody = TransitionConstraintsBody;
// HELPER FUNCTIONS
// ================================================================================================
function validateRegisterDepths(a, b) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            throw new Error('transition constraints input block structure conflicts with transition function');
        }
    }
}
function validateBaseCycleMasks(a, b) {
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
//# sourceMappingURL=TransitionConstraintsBody.js.map