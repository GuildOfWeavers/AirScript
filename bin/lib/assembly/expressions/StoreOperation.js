"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const targets = {
    'save.local': 'local'
};
// CLASS DEFINITION
// ================================================================================================
class StoreOperation extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(operation, index, value) {
        super(value.dimensions, value.degree);
        this.target = targets[operation];
        this.index = index;
        this.value = value;
        if (!this.target) {
            throw new Error(`${operation} is not a valid store operation`);
        }
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString() {
        return `(store.${this.target} ${this.index} ${this.value.toString()})`;
    }
}
exports.StoreOperation = StoreOperation;
//# sourceMappingURL=StoreOperation.js.map