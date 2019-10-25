"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(dimensions, degree, children = []) {
        this.dimensions = dimensions;
        this.degree = degree;
        this.children = children;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    compress() {
        this.children.forEach(child => child.compress());
    }
    collectLoadOperations(source, result) {
        this.children.forEach(child => child.collectLoadOperations(source, result));
    }
    replace(oldExpression, newExpression) {
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i] === oldExpression) {
                this.children[i] = newExpression;
            }
            else {
                this.children[i].replace(oldExpression, newExpression);
            }
        }
    }
    updateLoadStoreIndex(source, fromIdx, toIdx) {
        this.children.forEach(child => child.updateLoadStoreIndex(source, fromIdx, toIdx));
    }
    // DIMENSION METHODS AND ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isScalar() {
        return (this.dimensions[0] === 0 && this.dimensions[1] === 0);
    }
    get isVector() {
        return (this.dimensions[0] > 0 && this.dimensions[1] === 0);
    }
    get isMatrix() {
        return (this.dimensions[1] > 0);
    }
    isSameDimensions(e) {
        return this.dimensions[0] === e.dimensions[0]
            && this.dimensions[1] === e.dimensions[1];
    }
}
exports.Expression = Expression;
//# sourceMappingURL=Expression.js.map