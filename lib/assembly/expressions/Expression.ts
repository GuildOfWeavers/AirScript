// IMPORTS
// ================================================================================================
import { Dimensions, ExpressionDegree } from "../../utils";
import { LoadSource } from "./utils";

// INTERFACES
// ================================================================================================

export interface JsCodeOptions {
    vectorAsArray?: boolean;
}

export interface AssemblyOptions {
    vectorAsList?: boolean;
}

// CLASS DEFINITION
// ================================================================================================
export abstract class Expression {

    readonly dimensions : Dimensions;
    readonly degree     : ExpressionDegree;
    readonly children   : Expression[]

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(dimensions: Dimensions, degree: ExpressionDegree, children: Expression[] = []) {
        this.dimensions = dimensions;
        this.degree = degree
        this.children = children;
    }

    // ABSTRACT METHODS
    // --------------------------------------------------------------------------------------------
    abstract toString(options?: AssemblyOptions): string;

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    compress(): void {
        this.children.forEach(child => child.compress());
    }

    collectLoadOperations(source: LoadSource, result: Map<Expression, Expression[]>): void {
        this.children.forEach(child => child.collectLoadOperations(source, result));
    }

    replace(oldExpression: Expression, newExpression: Expression) {
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i] === oldExpression) {
                this.children[i] = newExpression;
            }
            else {
                this.children[i].replace(oldExpression, newExpression);
            }
        }
    }

    updateLoadIndex(source: LoadSource, fromIdx: number, toIdx: number): void {
        this.children.forEach(child => child.updateLoadIndex(source, fromIdx, toIdx));
    }

    // DIMENSION METHODS AND ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isScalar(): boolean {
        return (this.dimensions[0] === 0 && this.dimensions[1] === 0);
    }

    get isVector(): boolean {
        return (this.dimensions[0] > 0 && this.dimensions[1] === 0);
    }

    get isMatrix(): boolean {
        return (this.dimensions[1] > 0);
    }

    isSameDimensions(e: Expression) {
        return this.dimensions[0] === e.dimensions[0]
            && this.dimensions[1] === e.dimensions[1];
    }
}