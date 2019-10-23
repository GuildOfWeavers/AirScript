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
        this.index = index;
        this.value = value;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString() {
        return `(store.${this.target} ${this.index} ${this.value.toString()})`;
    }
}
exports.StoreExpression = StoreExpression;
//# sourceMappingURL=StoreExpression.js.map