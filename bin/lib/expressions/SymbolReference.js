"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// CLASS DEFINITION
// ================================================================================================
class SymbolReference extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(symbol, dimensions, degree) {
        super(dimensions, degree);
        this.symbol = symbol;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    get isRegisterBank() {
        return (this.symbol.length === 1);
    }
    get isRegister() {
        return (this.symbol.length > 1 && !this.symbol.startsWith('$'));
    }
    get isVariable() {
        return (this.symbol.startsWith('$'));
    }
    toCode() {
        if (this.isRegisterBank) {
            return `f.newVectorFrom(${this.symbol})`;
        }
        else {
            return `${this.symbol}`;
        }
    }
}
exports.SymbolReference = SymbolReference;
//# sourceMappingURL=SymbolReference.js.map