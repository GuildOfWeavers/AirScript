"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lexer_1 = require("./lib/lexer");
const parser_1 = require("./lib/parser");
const visitor_1 = require("./lib/visitor");
const AirObject_1 = require("./lib/AirObject");
const errors_1 = require("./lib/errors");
const utils_1 = require("./lib/utils");
// MODULE VARIABLES
// ================================================================================================
const DEFAULT_LIMITS = {
    maxSteps: 2 ** 20,
    maxMutableRegisters: 64,
    maxReadonlyRegisters: 64,
    maxConstraintCount: 1024,
    maxConstraintDegree: 16,
    maxExtensionFactor: 32
};
// PUBLIC FUNCTIONS
// ================================================================================================
function parseScript(script, limits, options) {
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
        let extensionFactor;
        let wasmOptions;
        if (options) {
            extensionFactor = options.extensionFactor;
            wasmOptions = options.wasmOptions;
        }
        const airConfig = visitor_1.visitor.visit(cst, { limits, wasmOptions });
        const air = new AirObject_1.AirObject(airConfig, extensionFactor);
        validateExtensionFactor(air.extensionFactor, air.maxConstraintDegree, limits.maxExtensionFactor);
        return air;
    }
    catch (error) {
        throw new errors_1.AirScriptError([error]);
    }
}
exports.parseScript = parseScript;
// HELPER FUNCTIONS
// ================================================================================================
function validateExtensionFactor(extensionFactor, maxConstraintDegree, maxExtensionFactor) {
    const minExtensionFactor = 2 ** Math.ceil(Math.log2(maxConstraintDegree * 2));
    if (extensionFactor > maxExtensionFactor || !Number.isInteger(extensionFactor)) {
        throw new TypeError(`Extension factor must be an integer smaller than or equal to ${maxExtensionFactor}`);
    }
    if (!utils_1.isPowerOf2(extensionFactor)) {
        throw new TypeError(`Extension factor must be a power of 2`);
    }
    if (extensionFactor < minExtensionFactor) {
        throw new TypeError(`Extension factor must be at ${minExtensionFactor}`);
    }
}
//# sourceMappingURL=index.js.map