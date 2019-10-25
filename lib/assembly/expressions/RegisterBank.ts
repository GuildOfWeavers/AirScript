// IMPORTS
// ================================================================================================
import { Expression } from "./Expression";

// INTERFACES
// ================================================================================================
export type BankType = 'trace' | 'static' | 'input';

// CLASS DEFINITION
// ================================================================================================
export class RegisterBank extends Expression {

    readonly bank: BankType;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(bank: BankType, width: number) {
        super([width, 0], new Array(width).fill(1n));
        if (bank === 'trace' || bank === 'static' || bank === 'input') {
            this.bank = bank;
        }
        else {
            throw new Error(`register bank '${bank}' is not valid`);
        }
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get isTrace(): boolean {
        return this.bank === 'trace';
    }

    get isStatic(): boolean {
        return this.bank === 'static';
    }

    get isInput(): boolean {
        return this.bank === 'input';
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString(): string {
        return this.bank;
    }

    toJsCode() {
        // TODO: revisit
        return '';
    }
}