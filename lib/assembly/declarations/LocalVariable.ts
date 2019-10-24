// IMPORTS
// ================================================================================================
import { StoreExpression } from "../expressions";
import {
    Dimensions, isScalar, isVector, areSameDimensions, ExpressionDegree, degreeToDimensions
} from "../../utils";

// CLASS DEFINITION
// ================================================================================================
export class LocalVariable {

    readonly dimensions : Dimensions;
    readonly degree     : ExpressionDegree;
    private binding?    : StoreExpression;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(degree: ExpressionDegree) {
        this.degree = degree;
        this.dimensions = degreeToDimensions(degree);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isBound(): boolean {
        return this.binding !== undefined;
    }

    getBinding(index: number): StoreExpression {
        if (!this.binding) throw new Error(`local variable ${index} has not yet been set`);
        return this.binding;
    }

    bind(value: StoreExpression, index: number) {
        if (!areSameDimensions(this.dimensions, value.dimensions)) {
            const vd = value.dimensions;
            throw new Error(`cannot store ${vd[0]}x${vd[1]} value in local variable ${index}`);
        }
        this.binding = value;
    }

    clearBinding() {
        this.binding = undefined;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        if (isScalar(this.dimensions)) return `(local scalar)`;
        else if (isVector(this.dimensions)) return `(local vector ${this.dimensions[0]})`;
        else return `(local matrix ${this.dimensions[0]} ${this.dimensions[1]})`;
    }
}