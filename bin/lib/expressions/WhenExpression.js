"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const degree_1 = require("./operations/degree");
// CLASS DEFINITION
// ================================================================================================
class WhenExpression extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(condition, tBlock, fBlock) {
        if (!tBlock.isSameDimensions(fBlock)) {
            throw new Error(`when...else statement branches must evaluate to values of same dimensions`);
        }
        const tDegree = degree_1.getDegree(tBlock, condition.degree, degree_1.addDegree);
        const fDegree = degree_1.getDegree(fBlock, condition.degree, degree_1.addDegree);
        const degree = tDegree; // TODO: maxDegree(tDegree, fDegree);
        super(tBlock.dimensions, degree);
        this.condition = condition;
        this.tBlock = tBlock;
        this.fBlock = fBlock;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toAssignment(target) {
        const cVar = 'tCondition';
        const tVar = 'tVar', fVar = 'fVar';
        const tCode = `${this.tBlock.toAssignment(tVar)}\n`;
        const fCode = `${this.fBlock.toAssignment(fVar)}\n`;
        return `${tCode}\n${fCode}`;
    }
    toCode() {
        throw new Error('when..else expression cannot be converted to pure code');
    }
}
exports.WhenExpression = WhenExpression;
//# sourceMappingURL=WhenExpression.js.map