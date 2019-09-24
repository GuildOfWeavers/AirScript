// IMPORTS
// ================================================================================================
import { Expression } from './Expression';
import { VariableReference } from './VariableReference';
import { CreateVector } from './vectors/CreateVector';

// INTERFACES
// ================================================================================================
export interface Statement {
    variable        : VariableReference;
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
                this.localVariables.add(variable.varRef);
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
                code += `${expression.toAssignment(variable.varRef)};\n`;
            }
        }

        // build code for the terminating expression
        code += `${this.outExpression.toAssignment(target)};\n`;

        // return statement block
        return `{\n${code}}`;
    }

    toCode(): string {
        throw new Error('statement block cannot be converted to pure code');
    }
}