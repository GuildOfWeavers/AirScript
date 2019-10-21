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

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isRegisterBank(): boolean {
        return (this.symbol.length === 1);
    }

    get isVariable(): boolean {
        return (this.symbol.includes('$'));
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    collectVariableReferences(result: Map<string, number>): void {
        if (this.isVariable) {
            let count = result.get(this.symbol) || 0;
            result.set(this.symbol, count + 1);
        }
    }

    toJsCode(assignTo?: string, options: JsCodeOptions = {}): string {
        let code = this.symbol;

        if (this.isRegisterBank) {
            if (!options.vectorAsArray) {
                code = `f.newVectorFrom(${code})`
            }
        }
        else if (this.isVector && options.vectorAsArray) {
            code = `${code}.toValues()`;
        }

        if (assignTo) {
            code = `${assignTo} = ${code};\n`;
        }
        return code;
    }

    toAssembly(): string {
        if (this.isRegisterBank) {
            return `$${this.symbol}`;
        }
        else {
            return `(load.local ${this.symbol})`;
        }
    }
}