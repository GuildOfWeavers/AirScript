// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from './Expression';
import { Dimensions } from '../utils';

// INTERFACES
// ================================================================================================
export type ExpressionValue = bigint | bigint[] | bigint[][];

// CLASS DEFINITION
// ================================================================================================
export class StaticExpression extends Expression {

    readonly value: ExpressionValue;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(value: ExpressionValue | string, name?: string) {
        let code: string, dimensions: Dimensions, degree: ExpressionDegree;

        // if the value was passed in as a string literal, convert it to bigint
        if (typeof value === 'string') {
            value = BigInt(value);
        }

        if (typeof value === 'bigint') {
            // value is a scalar
            code = `${value}n`;
            dimensions = [0, 0];
            degree = 0n;
        }
        else {
            if (!name) throw new Error(`missing name for a non-scalar static expression`);

            // value is a vector or a matrix
            code = `g.${name}`;
            const rowCount = value.length;

            if (typeof value[0] === 'bigint') {
                // value is a vector
                dimensions = [rowCount, 0];
                degree = new Array(rowCount).fill(0n);
            }
            else {
                // value is a matrix
                const colCount = (value[0] as bigint[]).length;
                dimensions = [rowCount, colCount];
                const colDegrees = new Array(colCount).fill(0n);
                degree = new Array(rowCount).fill(colDegrees);
            }
        }

        super(code, dimensions, degree);
        this.value = value;
    }
}