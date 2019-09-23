// IMPORTS
// ================================================================================================
import { Dimensions } from "../utils";

// INTERFACES
// ================================================================================================
export type ExpressionDegree = bigint | bigint[] | bigint[][];

// CLASS DEFINITION
// ================================================================================================
export abstract class Expression {

    readonly dimensions: Dimensions;
    readonly degree    : ExpressionDegree;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(dimensions: Dimensions, degree: ExpressionDegree) {
        this.dimensions = dimensions;
        this.degree = degree
    }

    // ABSTRACT METHODS
    // --------------------------------------------------------------------------------------------
    abstract toCode(): string;

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toAssignment(target: string): string {
        return `${target} = ${this.toCode()}`;
    }

    // DIMENSION METHODS AND ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isScalar(): boolean {
        return (this.dimensions[0] === 0 && this.dimensions[1] === 0);
    }

    get isList(): boolean {
        return false;
    }

    get isVector(): boolean {
        return (!this.isList && this.dimensions[0] > 0 && this.dimensions[1] === 0);
    }

    get isMatrix(): boolean {
        return (this.dimensions[1] > 0);
    }

    isSameDimensions(e: Expression) {
        return this.dimensions[0] === e.dimensions[0]
            && this.dimensions[1] === e.dimensions[1]
            && this.isList === e.isList;
    }
}