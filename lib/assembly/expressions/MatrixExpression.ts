// IMPORTS
// ================================================================================================
import { Expression } from "./Expression";

// CLASS DEFINITION
// ================================================================================================
export class MatrixExpression extends Expression {

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(elements: Expression[][]) {
        
        const rowCount = elements.length;
        const colCount = elements[0].length;
        const children: Expression[] = [];

        let degree: bigint[][] = [];
        for (let row of elements) {
            let rowDegree: bigint[] = [];
            for (let element of row) {
                if (element.isScalar) {
                    rowDegree.push(element.degree as bigint);
                }
                else {
                    throw new Error('matrix elements must be scalars');
                }
                children.push(element);
            }

            if (rowDegree.length !== colCount) {
                throw new Error('all matrix rows must have the same number of columns');
            }

            degree.push(rowDegree);
        }

        super([rowCount, colCount], degree, children);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get elements(): Expression[][] {
        const rows: Expression[][] = [];
        const [rowCount, colCount] = this.dimensions;
        for (let i = 0; i < rowCount; i++) {
            rows.push(this.children.slice(i * colCount, (i + 1) * colCount));
        }
        return rows;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------   
    toString(): string {
        const rows = this.elements.map(r => `(${r.map(e => e.toString()).join(' ')})`);
        return `(matrix ${rows.join(' ')})`
    }
}