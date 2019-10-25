// IMPORTS
// ================================================================================================
import { Expression } from "./Expression";

// CLASS DEFINITION
// ================================================================================================
export class ExtractExpression extends Expression {

    readonly index: number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(source: Expression, index: number) {
        if (source.isScalar) throw new Error('cannot slice a scalar value');
        if (source.isMatrix) throw new Error('cannot slice a matrix value');
        
        const sourceLength = source.dimensions[0];
        if (index < 0 || index >= sourceLength) {
            throw new Error(`vector index ${index} is out of bounds; expected to be within [${0}, ${sourceLength})`);
        }
        
        super([0, 0], (source.degree as bigint[])[index], [source]);
        this.index = index;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get source(): Expression { return this.children[0]; }
    
    get start(): number { return this.index; }
    get end(): number { return this.index; }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        return `(get ${this.source.toString()} ${this.index})`;
    }

    toJsCode(): string {
        let code = `${this.source.toJsCode({ vectorAsArray: true })}[${this.index}]`;
        return code;
    }
}