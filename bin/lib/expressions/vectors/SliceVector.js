"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
const SymbolReference_1 = require("../SymbolReference");
// CLASS DEFINITION
// ================================================================================================
class SliceVector extends Expression_1.Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(source, start, end) {
        if (source.isScalar)
            throw new Error('cannot slice a scalar value');
        if (source.isMatrix)
            throw new Error('cannot slice a matrix value');
        const sourceLength = source.dimensions[0];
        if (start < 0 || start >= sourceLength) {
            throw new Error(`slice start index ${start} is out of bounds; expected to be within [${0}, ${sourceLength})`);
        }
        if (end < start || end >= sourceLength) {
            throw new Error(`slice end index ${start} is out of bounds; expected to be within [${start}, ${sourceLength})`);
        }
        const length = end - start + 1;
        super([length, 0], source.degree.slice(start, end + 1));
        this.source = source;
        this.start = start;
        this.end = end;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode(skipWrapping = false) {
        let code = '';
        if (this.source instanceof SymbolReference_1.SymbolReference && this.source.isRegisterBank) {
            code = `${this.source.symbol}.slice(${this.start}, ${this.end + 1})`;
        }
        else {
            code = `${this.source.toCode()}.values.slice(${this.start}, ${this.end + 1})`;
        }
        return (skipWrapping ? code : `f.newVectorFrom(${code})`);
    }
}
exports.SliceVector = SliceVector;
//# sourceMappingURL=SliceVector.js.map