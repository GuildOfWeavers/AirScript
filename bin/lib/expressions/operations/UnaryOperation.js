"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
// CLASS DEFINITION
// ================================================================================================
class UnaryOperation extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(operation, operand, dimensions, degree) {
        super(dimensions, degree);
        this.operation = operation;
        this.operand = operand;
    }
    static neg(operand) {
        if (operand.isList) {
            throw new Error('cannot negate destructured list');
        }
        return new UnaryOperation(1 /* neg */, operand, operand.dimensions, operand.degree);
    }
    static inv(operand) {
        if (operand.isList) {
            throw new Error('cannot invert destructured list');
        }
        const degree = operand.degree; // TODO: incorrect
        return new UnaryOperation(2 /* inv */, operand, operand.dimensions, degree);
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo, options = {}) {
        const opFunction = getOpFunction(this.operation, this.operand);
        let code = `f.${opFunction}(${this.operand.toJsCode()})`;
        if (this.isVector && options.vectorAsArray) {
            code = `${code}.values`;
        }
        if (assignTo) {
            code = `${assignTo} = ${code};\n`;
        }
        return code;
    }
}
exports.UnaryOperation = UnaryOperation;
// HELPER FUNCTIONS
// ================================================================================================
function getOpFunction(op, e) {
    switch (op) {
        case 1 /* neg */: {
            if (e.isScalar)
                return `neg`;
            else if (e.isVector)
                return 'negVectorElements';
            else
                return 'negMatrixElements';
        }
        case 2 /* inv */: {
            if (e.isScalar)
                return `inv`;
            else if (e.isVector)
                return 'invVectorElements';
            else
                return 'invMatrixElements';
        }
    }
}
//# sourceMappingURL=UnaryOperation.js.map