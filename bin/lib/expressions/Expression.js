"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(dimensions, degree) {
        this.dimensions = dimensions;
        this.degree = degree;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toAssignment(target) {
        return `${target} = ${this.toCode()}`;
    }
    // DIMENSION METHODS AND ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isScalar() {
        return (this.dimensions[0] === 0 && this.dimensions[1] === 0);
    }
    get isList() {
        return false;
    }
    get isVector() {
        return (!this.isList && this.dimensions[0] > 0 && this.dimensions[1] === 0);
    }
    get isMatrix() {
        return (this.dimensions[1] > 0);
    }
    isSameDimensions(e) {
        return this.dimensions[0] === e.dimensions[0]
            && this.dimensions[1] === e.dimensions[1]
            && this.isList === e.isList;
    }
}
exports.Expression = Expression;
//# sourceMappingURL=Expression.js.map