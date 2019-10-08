"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Expression_1 = require("./Expression");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class TransitionConstraintsBody extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(root, template) {
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
        validateInputLoopStructure(template.traceTemplate, loopStructure.inputTemplate);
        validateSegmentLoopStructure(template.segmentMasks, loopStructure.segmentMasks);
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
// HELPER FUNCTIONS
// ================================================================================================
function validateInputLoopStructure(a, b) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            throw new Error('TODO: inconsistent loop structure');
        }
    }
}
function validateSegmentLoopStructure(a, b) {
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
//# sourceMappingURL=TransitionConstraintsBody.js.map