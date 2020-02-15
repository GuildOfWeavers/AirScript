"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class TraceTemplate {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent, domain) {
        // TODO: validate start/end
        this.domain = domain ? domain : parent.domain;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get domainWidth() {
        return this.domain.end - this.domain.start + 1;
    }
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    isSubdomainOf(domain) {
        return (domain.start <= this.domain.start && domain.end >= this.domain.end);
    }
    isInDomain(index) {
        return (this.domain.start <= index || this.domain.end >= index);
    }
}
exports.TraceTemplate = TraceTemplate;
//# sourceMappingURL=TraceTemplate.js.map