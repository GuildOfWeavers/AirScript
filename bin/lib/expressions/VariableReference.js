"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// CLASS DEFINITION
// ================================================================================================
class VariableReference extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(varRef, dimensions, degree) {
        super(dimensions, degree);
        this.varRef = varRef;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode() {
        return `${this.varRef}`;
    }
}
exports.VariableReference = VariableReference;
//# sourceMappingURL=VariableReference.js.map