"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
// CLASS DEFINITION
// ================================================================================================
class RegisterBank extends Expression_1.Expression {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(bank, width) {
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
    get isTrace() {
        return this.bank === 'trace';
    }
    get isStatic() {
        return this.bank === 'static';
    }
    get isInput() {
        return this.bank === 'input';
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString() {
        return this.bank;
    }
    toJsCode() {
        // TODO: revisit
        return '';
    }
}
exports.RegisterBank = RegisterBank;
//# sourceMappingURL=RegisterBank.js.map