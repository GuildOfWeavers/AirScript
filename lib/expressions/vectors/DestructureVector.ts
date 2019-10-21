// IMPORTS
// ================================================================================================
import { Expression, AssemblyOptions } from "../Expression";

// CLASS DEFINITION
// ================================================================================================
export class DestructureVector extends Expression {
    
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(source: Expression) {
        if (source.isScalar) throw new Error('cannot destructure a scalar value');
        if (source.isMatrix) throw new Error('cannot destructure a matrix value');
        if (source.isList) throw new Error('cannot destructure a destructured value');
        
        const sourceLength = source.dimensions[0];
        super([sourceLength, 0], source.degree, [source]);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get source(): Expression { return this.children[0]; }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    get isList(): boolean {
        return true;
    }

    toJsCode(assignTo?: string): string {
        if (assignTo) throw new Error('cannot assign a destructured value');
        return `...${this.source.toJsCode(undefined, { vectorAsArray: true })}`;
    }

    toAssembly(options?: AssemblyOptions): string {
        return this.source.toAssembly(options);
    }
}