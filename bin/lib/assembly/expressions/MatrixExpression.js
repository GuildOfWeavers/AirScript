"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// CLASS DEFINITION
// ================================================================================================
class MatrixExpression extends Expression_1.Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(elements) {
        const rowCount = elements.length;
        const colCount = elements[0].length;
        const children = [];
        let degree = [];
        for (let row of elements) {
            let rowDegree = [];
            for (let element of row) {
                if (element.isScalar) {
                    rowDegree.push(element.degree);
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
    get elements() {
        const rows = [];
        const [rowCount, colCount] = this.dimensions;
        for (let i = 0; i < rowCount; i++) {
            rows.push(this.children.slice(i * colCount, (i + 1) * colCount));
        }
        return rows;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------   
    toString() {
        const rows = this.elements.map(r => `(${r.map(e => e.toString()).join(' ')})`);
        return `(matrix ${rows.join(' ')})`;
    }
    toJsCode() {
        const rows = this.elements.map(r => `[${r.map(e => e.toJsCode()).join(', ')}]`);
        return `f.newMatrixFrom([${rows.join(', ')}])`;
    }
}
exports.MatrixExpression = MatrixExpression;
//# sourceMappingURL=MatrixExpression.js.map