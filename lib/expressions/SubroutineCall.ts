// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from './Expression';
import { Dimensions, isVector } from '../utils';

// CLASS DEFINITION
// ================================================================================================
export class SubroutineCall extends Expression {

    readonly subroutine: string;
    readonly parameters: string[];

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(subroutine: string, parameters: string[], dimensions: Dimensions, degree: ExpressionDegree) {
        if (!isVector(dimensions)) throw new Error(`subroutines must return a vector`);
        super(dimensions, degree);
        this.subroutine = subroutine;
        this.parameters = parameters;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode(skipWrapping = false): string {
        const code = `${this.subroutine}(${this.parameters.join(', ')})`;
        return (skipWrapping ? code : `f.newVectorFrom(${code})`);
    }
}