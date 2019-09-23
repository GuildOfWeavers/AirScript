"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// CLASS DEFINITION
// ================================================================================================
class RegisterReference extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(regRef) {
        super([0, 0], 1n);
        this.regRef = regRef;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode() {
        return `${this.regRef}`;
    }
}
exports.RegisterReference = RegisterReference;
//# sourceMappingURL=RegisterReference.js.map