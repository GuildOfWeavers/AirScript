// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree, JsCodeOptions } from "../Expression";
import { Dimensions } from "../../utils";

// INTERFACES
// ================================================================================================
enum OperationType {
    neg = 1, inv = 2
}

// CLASS DEFINITION
// ================================================================================================
export class UnaryOperation extends Expression {

    readonly operation  : OperationType;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    private constructor(operation: OperationType, operand: Expression, dimensions: Dimensions, degree: ExpressionDegree) {
        super(dimensions, degree, [operand]);
        this.operation = operation;
    }

    static neg(operand: Expression): UnaryOperation {
        if (operand.isList) {
            throw new Error('cannot negate destructured list');
        }
        return new UnaryOperation(OperationType.neg, operand, operand.dimensions, operand.degree);
    }

    static inv(operand: Expression): UnaryOperation {
        if (operand.isList) {
            throw new Error('cannot invert destructured list');
        }

        const degree = operand.degree; // TODO: incorrect
        return new UnaryOperation(OperationType.inv, operand, operand.dimensions, degree);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get operand(): Expression { return this.children[0]; }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string, options: JsCodeOptions = {}): string {
        const opFunction = getOpFunction(this.operation, this.operand);
        let code = `f.${opFunction}(${this.operand.toJsCode()})`;

        if (this.isVector && options.vectorAsArray) {
            code = `${code}.toValues()`;
        }

        if (assignTo) {
            code = `${assignTo} = ${code};\n`;
        }
        return code;
    }

    toAssembly(): string {
        const op = OperationType[this.operation];
        return `(${op} ${this.operand.toAssembly()})`;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function getOpFunction(op: OperationType, e: Expression): string {
    switch (op) {
        case OperationType.neg: {
            if (e.isScalar)             return `neg`;
            else if (e.isVector)        return 'negVectorElements';
            else                        return 'negMatrixElements';
        }
        case OperationType.inv: {
            if (e.isScalar)             return `inv`;
            else if (e.isVector)        return 'invVectorElements';
            else                        return 'invMatrixElements';
        }
    }
}