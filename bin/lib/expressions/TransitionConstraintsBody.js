"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class TransitionConstraintsBody extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(root) {
        if (root.isScalar) {
            super([1, 0], [root.degree]);
        }
        else if (root.isVector) {
            super(root.dimensions, root.degree);
        }
        else {
            throw new Error(`transition constraints must evaluate to a scalar or to a vector`);
        }
        this.root = root;
        const loopStructure = utils_1.getLoopStructure(root);
        // TODO: validate loop structure
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo) {
        if (assignTo)
            throw new Error('transition constraints body cannot be assigned to a variable');
        let code = 'let result;\n';
        code += this.root.toJsCode('result');
        code += this.root.isScalar ? `return [result];\n` : `return result.values;\n`;
        return code;
    }
}
exports.TransitionConstraintsBody = TransitionConstraintsBody;
//# sourceMappingURL=TransitionConstraintsBody.js.map