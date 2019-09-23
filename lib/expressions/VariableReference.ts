// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from './Expression';
import { Dimensions } from '../utils';

// CLASS DEFINITION
// ================================================================================================
export class VariableReference extends Expression {

    readonly varRef: string;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(varRef: string, dimensions: Dimensions, degree: ExpressionDegree) {
        super(dimensions, degree);
        this.varRef = varRef;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode(): string {
        return `${this.varRef}`;
    }
}