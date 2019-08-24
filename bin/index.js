"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lexer_1 = require("./lib/lexer");
const parser_1 = require("./lib/parser");
const visitor_1 = require("./lib/visitor");
const AirObject_1 = require("./lib/AirObject");
const errors_1 = require("./lib/errors");
// MODULE VARIABLES
// ================================================================================================
const DEFAULT_LIMITS = {
    maxSteps: 2 ** 20,
    maxMutableRegisters: 64,
    maxReadonlyRegisters: 64,
    maxConstraintCount: 1024,
    maxConstraintDegree: 16
};
// PUBLIC FUNCTIONS
// ================================================================================================
function parseScript(script, limits, wasmOptions) {
    // apply defaults
    limits = { ...DEFAULT_LIMITS, ...limits };
    // tokenize input
    const lexResult = lexer_1.lexer.tokenize(script);
    if (lexResult.errors.length > 0) {
        throw new errors_1.AirScriptError(lexResult.errors);
    }
    // apply grammar rules
    parser_1.parser.input = lexResult.tokens;
    const cst = parser_1.parser.script();
    if (parser_1.parser.errors.length > 0) {
        throw new errors_1.AirScriptError(parser_1.parser.errors);
    }
    // build STARK config
    try {
        const airConfig = visitor_1.visitor.visit(cst, { limits, wasmOptions });
        const air = new AirObject_1.AirObject(airConfig);
        return air;
    }
    catch (error) {
        throw new errors_1.AirScriptError([error]);
    }
}
exports.parseScript = parseScript;
//# sourceMappingURL=index.js.map