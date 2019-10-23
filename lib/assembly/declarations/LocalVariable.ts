// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from "../expressions";
import { Dimensions, isScalar, isVector, areSameDimensions } from "../../utils";

// CLASS DEFINITION
// ================================================================================================
export class LocalVariable {

    readonly dimensions : Dimensions;
    readonly degree     : ExpressionDegree;
    private value?      : Expression;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(degree: ExpressionDegree) {
        this.degree = degree;
        if (typeof degree === 'bigint') {
            this.dimensions = [0, 0];
        }
        else if (typeof degree[0] === 'bigint') {
            this.dimensions = [degree.length, 0];
        }
        else {
            this.dimensions = [degree.length, degree[0].length];
        }
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    getValue(index: number): Expression {
        if (!this.value) throw new Error(`local variable ${index} has not yet been set`);
        return this.value;
    }

    setValue(value: Expression, index: number) {
        if (areSameDimensions(this.dimensions, value.dimensions)) {
            const vd = value.dimensions;
            throw new Error(`cannot store ${vd[0]}x${vd[1]} value in local variable ${index}`);
        }
        this.value = value;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        if (isScalar(this.dimensions)) return `(local scalar)`;
        else if (isVector(this.dimensions)) return `(local vector ${this.dimensions[0]})`;
        else return `(local matrix ${this.dimensions[0]} ${this.dimensions[1]})`;
    }
}