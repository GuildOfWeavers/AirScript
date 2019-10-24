"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../utils");
// CLASS DEFINITION
// ================================================================================================
class LocalVariable {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(degree) {
        this.degree = degree;
        this.dimensions = utils_1.degreeToDimensions(degree);
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isBound() {
        return this.binding !== undefined;
    }
    getBinding(index) {
        if (!this.binding)
            throw new Error(`local variable ${index} has not yet been set`);
        return this.binding;
    }
    bind(value, index) {
        if (!utils_1.areSameDimensions(this.dimensions, value.dimensions)) {
            const vd = value.dimensions;
            throw new Error(`cannot store ${vd[0]}x${vd[1]} value in local variable ${index}`);
        }
        this.binding = value;
    }
    clearBinding() {
        this.binding = undefined;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString() {
        if (utils_1.isScalar(this.dimensions))
            return `(local scalar)`;
        else if (utils_1.isVector(this.dimensions))
            return `(local vector ${this.dimensions[0]})`;
        else
            return `(local matrix ${this.dimensions[0]} ${this.dimensions[1]})`;
    }
}
exports.LocalVariable = LocalVariable;
//# sourceMappingURL=LocalVariable.js.map