"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// CLASS DEFINITION
// ================================================================================================
class UnaryOperation extends Expression_1.Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(operation, operand) {
        if (operation === 'neg') {
            super(operand.dimensions, operand.degree, [operand]);
        }
        else if (operation === 'inv') {
            const degree = operand.degree; // TODO: incorrect
            super(operand.dimensions, degree, [operand]);
        }
        else {
            throw new Error(`unary operation '${operation}' is not valid`);
        }
        this.operation = operation;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get operand() { return this.children[0]; }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString() {
        return `(${this.operation} ${this.operand.toString()})`;
    }
}
exports.UnaryOperation = UnaryOperation;
//# sourceMappingURL=UnaryOperation.js.map