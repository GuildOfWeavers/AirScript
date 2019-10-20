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
    toJsCode(assignTo, options = {}) {
        let code = `${this.subroutine}(${this.parameters.join(', ')})`;
        if (!options.vectorAsArray) {
            code = `f.newVectorFrom(${code})`;
        }
        if (assignTo) {
            code = `${assignTo} = ${code};\n`;
        }
        return code;
    }
    toAssembly() {
        return `(${this.subroutine} ${this.parameters.join(' ')})`;
    }
}
exports.SubroutineCall = SubroutineCall;
//# sourceMappingURL=SubroutineCall.js.map