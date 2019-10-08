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
            super([1, 0], [inputBlock.degree]);
        }
        else if (inputBlock.isVector) {
            super(inputBlock.dimensions, inputBlock.degree);
        }
        else {
            throw new Error(`transition function must evaluate to a scalar or to a vector`);
        }
        this.inputBlock = inputBlock;
        const loopStructure = utils_1.getInputBlockStructure(inputBlock);
        this.traceTemplate = loopStructure.traceTemplate;
        this.segmentMasks = loopStructure.segmentMasks;
    }
    // PUBLIC ACCESSORS
    // --------------------------------------------------------------------------------------------
    get baseCycleLength() {
        return this.segmentMasks[0].length;
    }
    get LoopCount() {
        return this.traceTemplate.length + this.segmentMasks.length;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo) {
        if (assignTo)
            throw new Error('transition function body cannot be assigned to a variable');
        let code = 'let result;\n';
        code += this.inputBlock.toJsCode('result');
        code += this.inputBlock.isScalar ? `return [result];\n` : `return result.values;\n`;
        return code;
    }
}
exports.TransitionFunctionBody = TransitionFunctionBody;
//# sourceMappingURL=TransitionFunctionBody.js.map