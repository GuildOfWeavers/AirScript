"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TraceTemplate_1 = require("./TraceTemplate");
// CLASS DEFINITION
// ================================================================================================
class DelegateTemplate extends TraceTemplate_1.TraceTemplate {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain, delegate) {
        super(domain);
        this.delegate = delegate;
    }
}
exports.DelegateTemplate = DelegateTemplate;
//# sourceMappingURL=DelegateTemplate.js.map