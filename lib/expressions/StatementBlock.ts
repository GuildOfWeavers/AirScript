// IMPORTS
// ================================================================================================
import { Expression } from './Expression';

// INTERFACES
// ================================================================================================
export interface Statement {
    variable        : string;
    expression      : Expression;
}

// CLASS DEFINITION
// ================================================================================================
export class StatementBlock extends Expression {

    readonly variables      : Set<string>;
    readonly outExpression  : Expression;
    readonly statements?    : Statement[];

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(outExpression: Expression, statements?: Statement[]) {
        if (!outExpression.isScalar && !outExpression.isVector) {
            throw new Error('statement block does not evaluate to a scalar or to a vector');
        }
        super(outExpression.dimensions, outExpression.degree);
        this.outExpression = outExpression;
        this.statements = statements;
        this.variables = new Set();

        if (statements) {
            for (let { variable } of statements) {
                this.variables.add(variable);
            }
        }
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toAssignment(target: string): string {
        let code = '{\n';

        // declare block variables
        if (this.variables.size > 0) {
            const variables: string[] = [];
            for (let variable of this.variables) {
                variables.push(variable);
            }
            code += `let ${variables.join(', ')};\n`
        }

        // build code for variable assignments
        if (this.statements) {
            for (let { variable, expression } of this.statements) {
                code += `${expression.toAssignment(variable)};\n`;
            }
        }

        // build code for the terminating expression
        code += `${this.outExpression.toAssignment(target)};\n`;
        code += '}';

        return code;
    }

    toCode(): string {
        throw new Error('statement block cannot be converted to pure code');
    }
}