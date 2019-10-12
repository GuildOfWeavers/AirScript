"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// CLASS DEFINITION
// ================================================================================================
class StatementBlock extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(outExpression, statements) {
        if (!outExpression.isScalar && !outExpression.isVector) {
            throw new Error('statement block does not evaluate to a scalar or to a vector');
        }
        super(outExpression.dimensions, outExpression.degree);
        this.outExpression = outExpression;
        this.statements = statements;
        this.localVariables = new Set();
        if (statements) {
            for (let { variable } of statements) {
                this.localVariables.add(variable);
            }
        }
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo, options = {}) {
        if (!assignTo)
            throw new Error('statement block cannot be converted to pure code');
        let code = ``;
        // declare block variables
        if (this.localVariables.size > 0) {
            const variables = [];
            for (let variable of this.localVariables) {
                variables.push(variable);
            }
            code += `let ${variables.join(', ')};\n`;
        }
        // build code for variable assignments
        if (this.statements) {
            for (let { variable, expression } of this.statements) {
                code += `${expression.toJsCode(variable)}`;
            }
        }
        // build code for the terminating expression
        code += `${this.outExpression.toJsCode(assignTo, options)}`;
        // return statement block
        return `{\n${code}}\n`;
    }
}
exports.StatementBlock = StatementBlock;
//# sourceMappingURL=StatementBlock.js.map