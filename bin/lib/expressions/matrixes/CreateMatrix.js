"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
// CLASS DEFINITION
// ================================================================================================
class CreateMatrix extends Expression_1.Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(elements) {
        const rowCount = elements.length;
        const colCount = elements[0].length;
        let degree = [];
        for (let row of elements) {
            let rowDegree = [];
            for (let element of row) {
                if (element.isScalar) {
                    rowDegree.push(element.degree);
                }
                else if (element.isList) {
                    rowDegree = rowDegree.concat(element.degree);
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
    toJsCode(assignTo) {
        if (!assignTo)
            throw new Error('matrix instantiation cannot be converted to pure code');
        const rows = this.elements.map(r => `[${r.map(e => e.toJsCode()).join(', ')}]`);
        return `${assignTo} = f.newMatrixFrom([${rows.join(', ')}])`;
    }
}
exports.CreateMatrix = CreateMatrix;
//# sourceMappingURL=CreateMatrix.js.map