"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class StaticRegister {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(pattern, binary, values, field) {
        if (pattern === 'repeat' || pattern == 'spread') {
            this.pattern = pattern;
        }
        else {
            throw new Error(`static register pattern '${pattern}' is invalid`);
        }
        this.binary = binary;
        this.values = values;
        if (binary) {
            for (let value of values) {
                if (value !== field.one && value !== field.zero) {
                    throw new Error(`binary register cannot contain non-binary value '${value}'`);
                }
            }
        }
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    toString() {
        const binary = this.binary ? ' binary' : '';
        return `(static ${this.pattern}${binary} ${this.values.join(' ')})`;
    }
}
exports.StaticRegister = StaticRegister;
//# sourceMappingURL=StaticRegister.js.map