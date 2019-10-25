"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// CLASS DEFINITION
// ================================================================================================
class ConstantValue extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(value) {
        if (typeof value === 'bigint') {
            // value is a scalar
            super([0, 0], 0n);
        }
        else if (Array.isArray(value)) {
            // value is a vector or a matrix
            const rowCount = value.length;
            if (typeof value[0] === 'bigint') {
                // value is a vector
                super([rowCount, 0], new Array(rowCount).fill(0n));
            }
            else {
                // value is a matrix
                const colCount = value[0].length;
                const colDegrees = new Array(colCount).fill(0n);
                super([rowCount, colCount], new Array(rowCount).fill(colDegrees));
                for (let row of value) {
                    if (row.length !== colCount) {
                        throw new Error(`all matrix rows must have the same number of columns`);
                    }
                }
            }
        }
        else {
            throw new Error(`invalid constant value '${value}'`);
        }
        this.value = value;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString() {
        if (this.isScalar) {
            return `${this.value}`;
        }
        else if (this.isVector) {
            return `(vector ${this.value.join(' ')})`;
        }
        else {
            const rows = this.value.map(r => `(${r.join(' ')})`);
            return `(matrix ${rows.join(' ')})`;
        }
    }
    toJsCode(options = {}) {
        if (this.isScalar) {
            return `${this.value}n`;
        }
        else if (this.isVector) {
            let code = `[${this.value.join('n, ')}n]`;
            if (!options.vectorAsArray) {
                code = `f.newVectorFrom(${code})`;
            }
            return code;
        }
        else {
            const rows = this.value.map(r => `[${r.join('n, ')}n]`);
            return `f.newMatrixFrom([${rows.join(', ')}])`;
        }
    }
}
exports.ConstantValue = ConstantValue;
//# sourceMappingURL=ConstantValue.js.map