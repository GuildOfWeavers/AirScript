"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
const SymbolReference_1 = require("../SymbolReference");
const SliceVector_1 = require("./SliceVector");
// CLASS DEFINITION
// ================================================================================================
class ExtractVectorElement extends Expression_1.Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(source, index) {
        if (source.isScalar)
            throw new Error('cannot slice a scalar value');
        if (source.isMatrix)
            throw new Error('cannot slice a matrix value');
        const sourceLength = source.dimensions[0];
        if (index < 0 || index >= sourceLength) {
            throw new Error(`vector index ${index} is out of bounds; expected to be within [${0}, ${sourceLength})`);
        }
        super([0, 0], source.degree[index]);
        this.source = source;
        this.index = index;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode() {
        if (this.source instanceof SymbolReference_1.SymbolReference && this.source.isRegisterBank) {
            return `${this.source.symbol}[${this.index}]`;
        }
        else if (this.source instanceof SliceVector_1.SliceVector) {
            return `${this.source.toCode(true)}[${this.index}]`;
        }
        else {
            return `${this.source.toCode()}.values[${this.index}]`;
        }
    }
}
exports.ExtractVectorElement = ExtractVectorElement;
//# sourceMappingURL=ExtractElement.js.map