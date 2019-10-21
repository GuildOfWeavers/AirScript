// IMPORTS
// ================================================================================================
import { Dimensions } from "../utils";

// INTERFACES
// ================================================================================================
export type ExpressionDegree = bigint | bigint[] | bigint[][];

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
    abstract toJsCode(assignTo?: string, options?: JsCodeOptions): string;
    abstract toAssembly(options?: AssemblyOptions): string;

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    collectVariableReferences(result: Map<string, number>): void {
        this.children.forEach(c => c.collectVariableReferences(result));
    }

    replaceVariableReference(variable: string, expression: Expression): void {
        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];
            if (child.isVariable && (child as any).symbol === variable) {
                this.children[i] = expression;
            }
            else {
                child.replaceVariableReference(variable, expression);
            }
        }
    }

    get isVariable(): boolean {
        return false;
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