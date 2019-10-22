"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const sources = {
    'load.const': 'const',
    'load.trace': 'trace',
    'load.fixed': 'fixed',
    'load.local': 'local'
};
// CLASS DEFINITION
// ================================================================================================
class LoadOperation extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(operation, index, value) {
        super(value.dimensions, value.degree);
        this.source = sources[operation];
        this.index = index;
        this.value = value;
        if (!this.source) {
            throw new Error(`${operation} is not a valid load operation`);
        }
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString() {
        return `(load.${this.source} ${this.index})`;
    }
}
exports.LoadOperation = LoadOperation;
//# sourceMappingURL=LoadOperation.js.map