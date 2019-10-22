"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// INTERFACES
// ================================================================================================
var OperationType;
(function (OperationType) {
    OperationType[OperationType["neg"] = 1] = "neg";
    OperationType[OperationType["inv"] = 2] = "inv";
})(OperationType || (OperationType = {}));
// CLASS DEFINITION
// ================================================================================================
class UnaryOperation extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(operation, operand, dimensions, degree) {
        super(dimensions, degree, [operand]);
        this.operation = operation;
    }
    static neg(operand) {
        return new UnaryOperation(OperationType.neg, operand, operand.dimensions, operand.degree);
    }
    static inv(operand) {
        const degree = operand.degree; // TODO: incorrect
        return new UnaryOperation(OperationType.inv, operand, operand.dimensions, degree);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get operand() { return this.children[0]; }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString() {
        const op = OperationType[this.operation];
        return `(${op} ${this.operand.toString()})`;
    }
}
exports.UnaryOperation = UnaryOperation;
//# sourceMappingURL=UnaryOperation.js.map