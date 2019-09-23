// IMPORTS
// ================================================================================================
import { Expression } from "../Expression";

// CLASS DEFINITION
// ================================================================================================
export class SliceVector extends Expression {

    readonly source : Expression;
    readonly start  : number;
    readonly end    : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(source: Expression, start: number, end: number) {
        if (source.isScalar) throw new Error('cannot slice a scalar value');
        if (source.isMatrix) throw new Error('cannot slice a matrix value');
        
        const sourceLength = source.dimensions[0];
        if (start < 0 || start >= sourceLength) {
            throw new Error(`slice start index ${start} is out of bounds; expected to be within [${0}, ${sourceLength})`);
        }
        
        if (end < start || end >= sourceLength) {
            throw new Error(`slice end index ${start} is out of bounds; expected to be within [${start}, ${sourceLength})`);
        }

        const length = end - start + 1;
        super([length, 0], (source.degree as bigint[]).slice(start, end + 1));
        this.source = source;
        this.start = start;
        this.end = end;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode(): string {
        return `${this.source.toCode()}.values.slice(${this.start}, ${this.end + 1})`;
    }
}