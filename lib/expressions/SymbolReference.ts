// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from './Expression';
import { Dimensions } from '../utils';

// CLASS DEFINITION
// ================================================================================================
export class SymbolReference extends Expression {

    readonly symRef: string;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(symRef: string, dimensions: Dimensions, degree: ExpressionDegree) {
        super(dimensions, degree);
        this.symRef = symRef;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode(): string {
        return `${this.symRef}`;
    }
}