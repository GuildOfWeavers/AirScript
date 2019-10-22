// IMPORTS
// ================================================================================================
import { Expression, AssemblyOptions } from "./Expression";

// CLASS DEFINITION
// ================================================================================================
export class VectorExpression extends Expression {

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(elements: Expression[]) {
        
        let degree: bigint[] = [];
        for (let element of elements) {
            if (element.isScalar) {
                degree.push(element.degree as bigint);
            }
            else {
                throw new Error('vector elements must be scalars');
            }
        }

        super([degree.length, 0], degree, elements);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get elements(): Expression[] { return this.children; }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString(options: AssemblyOptions = {}): string {
        const list = this.elements.map(e => e.toString({ vectorAsList: true })).join(' ');
        return options.vectorAsList ? list : `(vector ${list})`;
    }
}