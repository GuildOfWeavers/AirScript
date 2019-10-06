"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
const SymbolReference_1 = require("../SymbolReference");
const BinaryOperation_1 = require("../operations/BinaryOperation");
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class InputLoop extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(initExpression, bodyExpression, registers, modifierId, modifierDegree) {
        if (!initExpression.isSameDimensions(bodyExpression)) {
            throw new Error(`init and body expressions must resolve to values of same dimensions`);
        }
        const degree = utils_1.maxDegree(utils_1.sumDegree(initExpression.degree, modifierDegree), bodyExpression.degree);
        super(initExpression.dimensions, degree);
        this.modifierId = modifierId;
        this.initExpression = initExpression;
        this.bodyExpression = bodyExpression;
        this.registers = registers;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo, options = {}, controller) {
        if (!assignTo)
            throw new Error('input loop cannot be reduced to unassigned code');
        if (!controller)
            throw new Error('input loop cannot be reduced to code without a loop controller');
        let code = 'let init, body;\n';
        code += this.initExpression.toJsCode('init');
        code += this.bodyExpression.toJsCode('body', options, controller);
        const iRef = new SymbolReference_1.SymbolReference('init', this.initExpression.dimensions, this.initExpression.degree);
        const bRef = new SymbolReference_1.SymbolReference('body', this.bodyExpression.dimensions, this.bodyExpression.degree);
        const modifier = controller.getModifier(this.modifierId);
        const result = BinaryOperation_1.BinaryOperation.add(BinaryOperation_1.BinaryOperation.mul(iRef, modifier), bRef);
        code += result.toJsCode(assignTo, options);
        return `{\n${code}}\n`;
    }
}
exports.InputLoop = InputLoop;
//# sourceMappingURL=InputLoop.js.map