"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
// CLASS DEFINITION
// ================================================================================================
class DestructureVector extends Expression_1.Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(source) {
        if (source.isScalar)
            throw new Error('cannot destructure a scalar value');
        if (source.isMatrix)
            throw new Error('cannot destructure a matrix value');
        if (source.isList)
            throw new Error('cannot destructure a destructured value');
        const sourceLength = source.dimensions[0];
        super([sourceLength, 0], source.degree);
        this.source = source;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    get isList() {
        return true;
    }
    toCode() {
        return `...${this.source.toCode()}.values`;
    }
}
exports.DestructureVector = DestructureVector;
//# sourceMappingURL=DestructureVector.js.map