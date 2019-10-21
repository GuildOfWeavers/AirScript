"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
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
        super([0, 0], source.degree[index], [source]);
        this.index = index;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get source() { return this.children[0]; }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo) {
        let code = `${this.source.toJsCode(undefined, { vectorAsArray: true })}[${this.index}]`;
        if (assignTo) {
            code = `${assignTo} = ${code};\n`;
        }
        return code;
    }
    toAssembly() {
        return `(get ${this.source.toAssembly()} ${this.index})`;
    }
}
exports.ExtractVectorElement = ExtractVectorElement;
//# sourceMappingURL=ExtractElement.js.map