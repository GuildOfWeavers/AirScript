"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// CLASS DEFINITION
// ================================================================================================
class ExtractExpression extends Expression_1.Expression {
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
        super([0, 0], source.degree[index], [source]);
        this.index = index;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get source() { return this.children[0]; }
    get start() { return this.index; }
    get end() { return this.index; }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString() {
        return `(get ${this.source.toString()} ${this.index})`;
    }
    toJsCode() {
        let code = `${this.source.toJsCode({ vectorAsArray: true })}[${this.index}]`;
        return code;
    }
}
exports.ExtractExpression = ExtractExpression;
//# sourceMappingURL=ExtractExpression.js.map