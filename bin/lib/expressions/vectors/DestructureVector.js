"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
const SymbolReference_1 = require("../SymbolReference");
const SliceVector_1 = require("./SliceVector");
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
        if (this.source instanceof SymbolReference_1.SymbolReference && this.source.isRegisterBank) {
            return `...${this.source.symbol}`;
        }
        else if (this.source instanceof SliceVector_1.SliceVector) {
            return `...${this.source.toCode(true)}`;
        }
        else {
            return `...${this.source.toCode()}.values`;
        }
    }
    toAssignment(target) {
        throw new Error('cannot assign a destructured value');
    }
}
exports.DestructureVector = DestructureVector;
//# sourceMappingURL=DestructureVector.js.map