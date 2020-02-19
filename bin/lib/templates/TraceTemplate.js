"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class TraceTemplate {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain) {
        utils_1.validate(domain[1] >= domain[0], errors.domainEndBeforeStart(domain));
        this.domain = domain;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get domainWidth() {
        return this.domain[1] - this.domain[0] + 1;
    }
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    isSubdomainOf(domain) {
        return (domain[0] <= this.domain[0] && domain[1] >= this.domain[1]);
    }
    isInDomain(index) {
        return (this.domain[0] <= index || this.domain[1] >= index);
    }
}
exports.TraceTemplate = TraceTemplate;
// ERRORS
// ================================================================================================
const errors = {
    domainEndBeforeStart: (v) => `invalid domain [${v}]: domain end is before domain start`
};
//# sourceMappingURL=TraceTemplate.js.map