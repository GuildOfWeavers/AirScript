// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from './Expression';
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

    get isRegister(): boolean {
        return (this.symbol.length > 1 && !this.symbol.startsWith('$'));
    }

    get isVariable(): boolean {
        return (this.symbol.startsWith('$'));
    }

    toCode(): string {
        if (this.isRegisterBank) {
            return `f.newVectorFrom(${this.symbol})`;
        }
        else {
            return `${this.symbol}`;
        }
    }
}