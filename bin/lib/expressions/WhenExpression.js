"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const BinaryOperation_1 = require("./operations/BinaryOperation");
const VariableReference_1 = require("./VariableReference");
const RegisterReference_1 = require("./RegisterReference");
const degreeUtils_1 = require("./degreeUtils");
// MODULE VARIABLES
// ================================================================================================
const ONE = new VariableReference_1.VariableReference('f.one', [0, 0], 0n);
// CLASS DEFINITION
// ================================================================================================
class WhenExpression extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(condition, tBlock, fBlock) {
        if (!tBlock.isSameDimensions(fBlock)) {
            throw new Error(`when...else statement branches must evaluate to values of same dimensions`);
        }
        const tDegree = degreeUtils_1.sumDegree(tBlock.degree, condition.degree);
        const fDegree = degreeUtils_1.sumDegree(fBlock.degree, condition.degree);
        const degree = degreeUtils_1.maxDegree(tDegree, fDegree);
        super(tBlock.dimensions, degree);
        this.condition = condition;
        this.tBlock = tBlock;
        this.fBlock = fBlock;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toAssignment(target) {
        const tVal = 'tVal', fVal = 'fVal';
        // evaluate when and else branches
        let code = '';
        code += `let ${tVal}, ${fVal};\n`;
        code += `${this.tBlock.toAssignment(tVal)}\n`;
        const tValRef = new VariableReference_1.VariableReference(tVal, this.tBlock.dimensions, this.tBlock.degree);
        code += `${this.fBlock.toAssignment(fVal)}\n`;
        const fValRef = new VariableReference_1.VariableReference(fVal, this.fBlock.dimensions, this.tBlock.degree);
        // build expressions for when and else modifiers
        let tMod;
        if (this.condition instanceof RegisterReference_1.RegisterReference) {
            tMod = this.condition;
        }
        else {
            code += `${this.condition.toAssignment('let tCon')};\n`;
            tMod = new VariableReference_1.VariableReference('tCon', this.condition.dimensions, this.condition.degree);
        }
        const fMod = BinaryOperation_1.BinaryOperation.sub(ONE, tMod);
        // compute the result
        const e1 = BinaryOperation_1.BinaryOperation.mul(tValRef, tMod);
        const e2 = BinaryOperation_1.BinaryOperation.mul(fValRef, fMod);
        const e3 = BinaryOperation_1.BinaryOperation.add(e1, e2);
        code += `${e3.toAssignment(target)};\n`;
        return `{\n${code}}`;
    }
    toCode() {
        throw new Error('when..else expression cannot be converted to pure code');
    }
}
exports.WhenExpression = WhenExpression;
//# sourceMappingURL=WhenExpression.js.map