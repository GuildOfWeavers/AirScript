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
    toJsCode(options = {}) {
        const jsFunction = getJsFunction(this.operation, this.operand);
        let code = `f.${jsFunction}(${this.operand.toJsCode()})`;
        if (this.isVector && options.vectorAsArray) {
            code = `${code}.toValues()`;
        }
        return code;
    }
}
exports.UnaryOperation = UnaryOperation;
// HELPER FUNCTIONS
// ================================================================================================
function getJsFunction(operation, e) {
    switch (operation) {
        case 'neg': {
            if (e.isScalar)
                return `neg`;
            else if (e.isVector)
                return 'negVectorElements';
            else
                return 'negMatrixElements';
        }
        case 'inv': {
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