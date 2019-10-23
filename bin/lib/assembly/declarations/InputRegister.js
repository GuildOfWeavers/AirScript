"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class InputRegister {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(secret, binary) {
        this.secret = secret;
        this.binary = binary;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString() {
        const scope = this.secret ? 'secret' : 'public';
        const binary = this.binary ? ' binary' : '';
        return `(input ${scope}${binary})`;
    }
}
exports.InputRegister = InputRegister;
//# sourceMappingURL=InputRegister.js.map