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
        if (typeof degree === 'bigint') {
            this.dimensions = [0, 0];
        }
        else if (typeof degree[0] === 'bigint') {
            this.dimensions = [degree.length, 0];
        }
        else {
            this.dimensions = [degree.length, degree[0].length];
        }
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    getValue(index) {
        if (!this.value)
            throw new Error(`local variable ${index} has not yet been set`);
        return this.value;
    }
    setValue(value, index) {
        if (!utils_1.areSameDimensions(this.dimensions, value.dimensions)) {
            const vd = value.dimensions;
            throw new Error(`cannot store ${vd[0]}x${vd[1]} value in local variable ${index}`);
        }
        this.value = value;
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