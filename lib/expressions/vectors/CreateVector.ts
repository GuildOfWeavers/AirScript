// IMPORTS
// ================================================================================================
import { Expression } from "../Expression";

// CLASS DEFINITION
// ================================================================================================
export class CreateVector extends Expression {

    readonly elements : Expression[];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(elements: Expression[]) {
        
        let degree: bigint[] = [];
        for (let element of elements) {
            if (element.isScalar) {
                degree.push(element.degree as bigint);
            }
            else if (element.isList) {
                degree = degree.concat(element.degree as bigint[]);
            }
            else {
                throw new Error('vector elements must be scalars');
            }
        }

        super([degree.length, 0], degree);
        this.elements = elements;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode(): string {
        return `f.newVectorFrom([${this.elements.map(e => e.toCode()).join(', ')}])`;
    }
}