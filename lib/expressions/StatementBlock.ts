// IMPORTS
// ================================================================================================
import { Expression, JsCodeOptions } from './Expression';
import { SymbolReference } from './SymbolReference';

// INTERFACES
// ================================================================================================
export interface Statement {
    variable        : string;
    expression      : Expression;
}

// CLASS DEFINITION
// ================================================================================================
export class StatementBlock extends Expression {

    readonly variables  : string[];

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(outExpression: Expression, statements?: Statement[]) {
        if (!outExpression.isScalar && !outExpression.isVector) {
            throw new Error('statement block does not evaluate to a scalar or to a vector');
        }

        const { variables, children } = compress(outExpression, statements);
        super(outExpression.dimensions, outExpression.degree, children);
        this.variables = variables;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get outExpression(): Expression { return this.children[this.children.length - 1]; }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string, options: JsCodeOptions = {}): string {
        if (!assignTo) throw new Error('statement block cannot be converted to pure code');

        let code = ``;

        // declare block variables
        if (this.variables.length > 0) {
            const variables: string[] = [];
            for (let variable of this.variables) {
                variables.push(variable);
            }
            code += `let ${variables.join(', ')};\n`
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

    toAssembly(): string {
        let code = '';
        for (let i = 0; i < this.variables.length; i++) {
            code += `(set ${this.variables[i]} ${this.children[i].toAssembly()})\n`;
        }

        code += this.outExpression.toAssembly();

        return code;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function compress(outExpression: Expression, statements: Statement[] = []) {

    // count variable references in all child expressions
    const referenceCounts = new Map<string, number>();
    for (let statement of statements) {
        statement.expression.collectVariableReferences(referenceCounts);
    }
    outExpression.collectVariableReferences(referenceCounts);

    // if a variable was referenced fewer than 2 times, replace it with its expression
    const variables: string[] = [];
    const children: Expression[] = [];
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

function replaceVariableReference(expression: Expression, statement: Statement): Expression {
    if (expression instanceof SymbolReference && expression.symbol === statement.variable) {
        return statement.expression;
    }
    else {
        expression.replaceVariableReference(statement.variable, statement.expression);
        return expression;
    }
}