"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const BinaryOperation_1 = require("./operations/BinaryOperation");
const SymbolReference_1 = require("./SymbolReference");
const utils_1 = require("./utils");
// MODULE VARIABLES
// ================================================================================================
const ONE = new SymbolReference_1.SymbolReference('f.one', [0, 0], 0n);
// CLASS DEFINITION
// ================================================================================================
class WhenExpression extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(condition, tBlock, fBlock) {
        if (!tBlock.isSameDimensions(fBlock)) {
            throw new Error(`when...else statement branches must evaluate to values of same dimensions`);
        }
        const tDegree = utils_1.sumDegree(tBlock.degree, condition.degree);
        const fDegree = utils_1.sumDegree(fBlock.degree, condition.degree);
        const degree = utils_1.maxDegree(tDegree, fDegree);
        super(tBlock.dimensions, degree);
        this.condition = condition;
        this.tBlock = tBlock;
        this.fBlock = fBlock;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo, options = {}) {
        if (!assignTo)
            throw new Error('when..else expression cannot be converted to pure code');
        const tVal = 'tVal', fVal = 'fVal';
        // evaluate when and else branches
        let code = '';
        code += `let ${tVal}, ${fVal};\n`;
        code += `${this.tBlock.toJsCode(tVal)}`;
        const tValRef = new SymbolReference_1.SymbolReference(tVal, this.tBlock.dimensions, this.tBlock.degree);
        code += `${this.fBlock.toJsCode(fVal)}`;
        const fValRef = new SymbolReference_1.SymbolReference(fVal, this.fBlock.dimensions, this.tBlock.degree);
        // build expressions for when and else modifiers
        let tMod;
        if (this.condition instanceof SymbolReference_1.SymbolReference) {
            tMod = this.condition;
        }
        else {
            code += `${this.condition.toJsCode('let tCon')}`;
            tMod = new SymbolReference_1.SymbolReference('tCon', this.condition.dimensions, this.condition.degree);
        }
        const fMod = BinaryOperation_1.BinaryOperation.sub(ONE, tMod);
        // compute the result
        const e1 = BinaryOperation_1.BinaryOperation.mul(tValRef, tMod);
        const e2 = BinaryOperation_1.BinaryOperation.mul(fValRef, fMod);
        const e3 = BinaryOperation_1.BinaryOperation.add(e1, e2);
        code += `${e3.toJsCode(assignTo, options)}`;
        return `{\n${code}}\n`;
    }
}
exports.WhenExpression = WhenExpression;
//# sourceMappingURL=WhenExpression.js.map