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

    readonly localVariables : Set<string>;
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
        this.localVariables = new Set();

        if (statements) {
            for (let { variable } of statements) {
                this.localVariables.add(variable);
            }
        }
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toAssignment(target: string): string {
        let code = '';

        // declare block variables
        if (this.localVariables.size > 0) {
            const variables: string[] = [];
            for (let variable of this.localVariables) {
                variables.push(variable);
            }
            code += `let ${variables.join(', ')};\n`
        }

        // build code for variable assignments
        if (this.statements) {
            for (let { variable, expression } of this.statements) {
                code += `${expression.toAssignment(variable)}`;
            }
        }

        // build code for the terminating expression
        code += `${this.outExpression.toAssignment(target)}`;

        // return statement block
        return `{\n${code}}\n`;
    }

    toCode(): string {
        throw new Error('statement block cannot be converted to pure code');
    }
}