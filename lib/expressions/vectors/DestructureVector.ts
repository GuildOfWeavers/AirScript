// IMPORTS
// ================================================================================================
import { Expression } from "../Expression";

// CLASS DEFINITION
// ================================================================================================
export class DestructureVector extends Expression {

    readonly source : Expression;
    
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(source: Expression) {
        if (source.isScalar) throw new Error('cannot destructure a scalar value');
        if (source.isMatrix) throw new Error('cannot destructure a matrix value');
        if (source.isList) throw new Error('cannot destructure a destructured value');
        
        const sourceLength = source.dimensions[0];
        super([sourceLength, 0], source.degree);
        this.source = source;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    get isList(): boolean {
        return true;
    }

    toJsCode(assignTo?: string): string {
        if (assignTo) throw new Error('cannot assign a destructured value');
        return `...${this.source.toJsCode(undefined, { vectorAsArray: true })}`;
    }

    toAssembly(): string {
        return this.source.toAssembly();
    }
}