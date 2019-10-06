// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree, JsCodeOptions } from './Expression';
import { Dimensions } from '../utils';

// CLASS DEFINITION
// ================================================================================================
export class SymbolReference extends Expression {

    readonly symbol: string;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(symbol: string, dimensions: Dimensions, degree: ExpressionDegree) {
        super(dimensions, degree);
        this.symbol = symbol;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    get isRegisterBank(): boolean {
        return (this.symbol.length === 1);
    }

    get isVariable(): boolean {
        return (this.symbol.startsWith('$'));
    }

    toJsCode(assignTo?: string, options: JsCodeOptions = {}): string {
        let code = this.symbol;

        if (this.isRegisterBank) {
            if (!options.vectorAsArray) {
                code = `f.newVectorFrom(${code})`
            }
        }
        else if (this.isVector && options.vectorAsArray) {
            code = `${code}.values`;
        }

        if (assignTo) {
            code = `${assignTo} = ${code};\n`;
        }
        return code;
    }
}