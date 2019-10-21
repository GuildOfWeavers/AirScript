"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const SymbolReference_1 = require("./SymbolReference");
// CLASS DEFINITION
// ================================================================================================
class StatementBlock extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(outExpression, statements) {
        if (!outExpression.isScalar && !outExpression.isVector) {
            throw new Error('statement block does not evaluate to a scalar or to a vector');
        }
        const { variables, children } = compress(outExpression, statements);
        super(outExpression.dimensions, outExpression.degree, children);
        this.variables = variables;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get outExpression() { return this.children[this.children.length - 1]; }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo, options = {}) {
        if (!assignTo)
            throw new Error('statement block cannot be converted to pure code');
        let code = ``;
        // declare block variables
        if (this.variables.length > 0) {
            const variables = [];
            for (let variable of this.variables) {
                variables.push(variable);
            }
            code += `let ${variables.join(', ')};\n`;
        }
        // build code for variable assignments
        for (let i = 0; i < this.variables.length; i++) {
            code += `${this.children[i].toJsCode(this.variables[i])}`;
        }
        // build code for the terminating expression
        code += `${this.outExpression.toJsCode(assignTo, options)}`;
        // return statement block
        return `{\n${code}}\n`;
    }
    toAssembly() {
        let code = '';
        for (let i = 0; i < this.variables.length; i++) {
            code += `(store.local ${this.variables[i]} ${this.children[i].toAssembly()})\n`;
        }
        code += this.outExpression.toAssembly();
        return code;
    }
}
exports.StatementBlock = StatementBlock;
// HELPER FUNCTIONS
// ================================================================================================
function compress(outExpression, statements = []) {
    // count variable references in all child expressions
    const referenceCounts = new Map();
    for (let statement of statements) {
        statement.expression.collectVariableReferences(referenceCounts);
    }
    outExpression.collectVariableReferences(referenceCounts);
    // if a variable was referenced fewer than 2 times, replace it with its expression
    const variables = [];
    const children = [];
    for (let i = 0; i < statements.length; i++) {
        let statement = statements[i];
        let referenceCount = referenceCounts.get(statement.variable) || 0;
        if (referenceCount < 2) {
            for (let s of statements) {
                s.expression = replaceVariableReference(s.expression, statement);
            }
            outExpression = replaceVariableReference(outExpression, statement);
        }
        else {
            variables.push(statement.variable);
            children.push(statement.expression);
        }
    }
    children.push(outExpression);
    return { variables, children };
}
function replaceVariableReference(expression, statement) {
    if (expression instanceof SymbolReference_1.SymbolReference && expression.symbol === statement.variable) {
        return statement.expression;
    }
    else {
        expression.replaceVariableReference(statement.variable, statement.expression);
        return expression;
    }
}
//# sourceMappingURL=StatementBlock.js.map