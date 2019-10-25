// IMPORTS
// ================================================================================================
import { Expression, JsCodeOptions } from "./Expression";

// INTERFACES
// ================================================================================================
type OperationType = 'neg' | 'inv';

// CLASS DEFINITION
// ================================================================================================
export class UnaryOperation extends Expression {

    readonly operation  : OperationType;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(operation: string, operand: Expression) {
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
    get operand(): Expression { return this.children[0]; }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        return `(${this.operation} ${this.operand.toString()})`;
    }

    toJsCode(options: JsCodeOptions = {}): string {
        const jsFunction = getJsFunction(this.operation, this.operand);
        let code = `f.${jsFunction}(${this.operand.toJsCode()})`;

        if (this.isVector && options.vectorAsArray) {
            code = `${code}.toValues()`;
        }
        return code;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function getJsFunction(operation: OperationType, e: Expression): string {
    switch (operation) {
        case 'neg': {
            if (e.isScalar)             return `neg`;
            else if (e.isVector)        return 'negVectorElements';
            else                        return 'negMatrixElements';
        }
        case 'inv': {
            if (e.isScalar)             return `inv`;
            else if (e.isVector)        return 'invVectorElements';
            else                        return 'invMatrixElements';
        }
    }
}