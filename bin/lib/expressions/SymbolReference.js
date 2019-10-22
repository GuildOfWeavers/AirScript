"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// CLASS DEFINITION
// ================================================================================================
class SymbolReference extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(symbol, dimensions, degree) {
        super(dimensions, degree);
        this.symbol = symbol;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isRegisterBank() {
        return (this.symbol.length === 1);
    }
    get isVariable() {
        return (this.symbol.includes('$'));
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    collectVariableReferences(result) {
        if (this.isVariable) {
            let count = result.get(this.symbol) || 0;
            result.set(this.symbol, count + 1);
        }
    }
    toJsCode(assignTo, options = {}) {
        let code = this.symbol;
        if (this.isRegisterBank) {
            if (!options.vectorAsArray) {
                code = `f.newVectorFrom(${code})`;
            }
        }
        else if (this.isVector && options.vectorAsArray) {
            code = `${code}.toValues()`;
        }
        if (assignTo) {
            code = `${assignTo} = ${code};\n`;
        }
        return code;
    }
    toAssembly() {
        if (this.isRegisterBank) {
            if (this.symbol === 'r')
                return `(load.trace 0)`;
            else if (this.symbol === 'n')
                return `(load.trace 1)`;
            else
                return `(load.const 0)`;
        }
        else {
            return `(load.local ${this.symbol})`;
        }
    }
}
exports.SymbolReference = SymbolReference;
//# sourceMappingURL=SymbolReference.js.map