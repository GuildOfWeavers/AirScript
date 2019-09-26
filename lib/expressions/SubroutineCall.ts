// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree, JsCodeOptions } from './Expression';
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
    toJsCode(assignTo?: string, options: JsCodeOptions = {}): string {
        let code = `${this.subroutine}(${this.parameters.join(', ')})`;
        
        if (!options.vectorAsArray) {
            code = `f.newVectorFrom(${code})`;
        }
        
        if (assignTo) {
            code = `${assignTo} = ${code};\n`;
        }
        return code;
    }
}