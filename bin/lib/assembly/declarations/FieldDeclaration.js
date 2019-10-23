"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const galois_1 = require("@guildofweavers/galois");
// CLASS DEFINITION
// ================================================================================================
class FieldDeclaration {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(type, modulus, wasmOptions) {
        if (type === 'prime') {
            this.type = type;
            this.field = galois_1.createPrimeField(modulus, wasmOptions);
        }
        else {
            throw new Error(`field type '${type}' is not supported`);
        }
        this.modulus = modulus;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString() {
        return `(field ${this.type} ${this.modulus})`;
    }
}
exports.FieldDeclaration = FieldDeclaration;
//# sourceMappingURL=FieldDeclaration.js.map