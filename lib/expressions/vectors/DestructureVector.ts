// IMPORTS
// ================================================================================================
import { Expression } from "../Expression";
import { SymbolReference } from "../SymbolReference";
import { SliceVector } from "./SliceVector";

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

    toCode(): string {
        if (this.source instanceof SymbolReference && this.source.isRegisterBank) {
            return `...${this.source.symbol}`;
        }
        else if (this.source instanceof SliceVector) {
            return `...${this.source.toCode(true)}`;
        }
        else {
            return `...${this.source.toCode()}.values`;
        }
    }

    toAssignment(target: string): string {
        throw new Error('cannot assign a destructured value');
    }
}