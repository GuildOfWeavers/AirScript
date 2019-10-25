"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class StoreExpression extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(operation, index, value) {
        super(value.dimensions, value.degree);
        this.target = utils_1.getStoreTarget(operation);
        this._index = index;
        this.value = value;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get index() {
        return this._index;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    updateLoadStoreIndex(target, fromIdx, toIdx) {
        if (this.target === target && this._index === fromIdx) {
            this._index = toIdx;
        }
    }
    toString() {
        return `(store.${this.target} ${this.index} ${this.value.toString()})`;
    }
    toJsCode() {
        return `v${this.index} = ${this.value.toJsCode()};\n`;
    }
}
exports.StoreExpression = StoreExpression;
//# sourceMappingURL=StoreExpression.js.map