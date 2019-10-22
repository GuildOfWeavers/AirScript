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
// NOOP EXPRESSION
// ================================================================================================
class NoopExpression extends Expression {
    constructor(dimensions, degree) {
        super(dimensions, degree);
    }
    toString() {
        return ``;
    }
}
exports.NoopExpression = NoopExpression;
//# sourceMappingURL=Expression.js.map