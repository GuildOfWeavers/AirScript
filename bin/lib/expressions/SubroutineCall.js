"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class SubroutineCall extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(subroutine, parameters, dimensions, degree) {
        if (!utils_1.isVector(dimensions))
            throw new Error(`subroutines must return a vector`);
        super(dimensions, degree);
        this.subroutine = subroutine;
        this.parameters = parameters;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toCode(skipWrapping = false) {
        const code = `${this.subroutine}(${this.parameters.join(', ')})`;
        return (skipWrapping ? code : `f.newVectorFrom(${code})`);
    }
}
exports.SubroutineCall = SubroutineCall;
//# sourceMappingURL=SubroutineCall.js.map