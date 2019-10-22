// IMPORTS
// ================================================================================================
import { Expression } from './Expression';

// CLASS DEFINITION
// ================================================================================================
export class ConstantValue extends Expression {

    readonly value: bigint | bigint[] | bigint[][];

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(value: bigint | bigint[] | bigint[][]) {
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
                const colCount = (value[0] as bigint[]).length;
                const colDegrees = new Array(colCount).fill(0n);
                super([rowCount, colCount], new Array(rowCount).fill(colDegrees));
                for (let row of value as bigint[][]) {
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
    toString(): string {
        if (this.isScalar) {
            return `${this.value}`;
        }
        else if (this.isVector) {
            return `(vector ${(this.value as bigint[]).join(' ')})`;
        }
        else {
            const rows = (this.value as bigint[][]).map(r => `(${r.join(' ')})`);
            return `(matrix ${rows.join(' ')})`;
        }
    }
}