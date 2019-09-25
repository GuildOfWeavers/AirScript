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
    constructor(symRef, dimensions, degree) {
        super(dimensions, degree);
        this.symRef = symRef;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode() {
        return `${this.symRef}`;
    }
}
exports.SymbolReference = SymbolReference;
//# sourceMappingURL=SymbolReference.js.map