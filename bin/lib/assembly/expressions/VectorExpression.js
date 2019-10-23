"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// CLASS DEFINITION
// ================================================================================================
class VectorExpression extends Expression_1.Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(elements) {
        let degree = [];
        for (let element of elements) {
            if (element.isScalar) {
                degree.push(element.degree);
            }
            else if (element.isVector) {
                degree = degree.concat(element.degree);
            }
            else {
                throw new Error('cannot build vector from matrix elements');
            }
        }
        super([degree.length, 0], degree, elements);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get elements() { return this.children; }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString(options = {}) {
        const list = this.elements.map(e => e.toString({ vectorAsList: true })).join(' ');
        return options.vectorAsList ? list : `(vector ${list})`;
    }
}
exports.VectorExpression = VectorExpression;
//# sourceMappingURL=VectorExpression.js.map