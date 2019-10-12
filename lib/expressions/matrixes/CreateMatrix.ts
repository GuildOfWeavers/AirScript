// IMPORTS
// ================================================================================================
import { Expression } from "../Expression";

// CLASS DEFINITION
// ================================================================================================
export class CreateMatrix extends Expression {

    readonly elements : Expression[][];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(elements: Expression[][]) {
        
        const rowCount = elements.length;
        const colCount = elements[0].length;

        let degree: bigint[][] = [];
        for (let row of elements) {
            let rowDegree: bigint[] = [];
            for (let element of row) {
                if (element.isScalar) {
                    rowDegree.push(element.degree as bigint);
                }
                else if (element.isList) {
                    rowDegree = rowDegree.concat(element.degree as bigint[]);
                }
                else {
                    throw new Error('matrix elements must be scalars');
                }
            }

            if (rowDegree.length !== colCount) {
                throw new Error('all matrix rows must have the same number of columns');
            }

            degree.push(rowDegree);
        }

        super([rowCount, colCount], degree);
        this.elements = elements;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string): string {
        if (!assignTo) throw new Error('matrix instantiation cannot be converted to pure code');
        const rows = this.elements.map(r => `[${r.map(e => e.toJsCode()).join(', ')}]`);
        return `${assignTo} = f.newMatrixFrom([${rows.join(', ')}])`;
    }
}