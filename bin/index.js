"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const lexer_1 = require("./lib/lexer");
const parser_1 = require("./lib/parser");
const visitor_1 = require("./lib/visitor");
const errors_1 = require("./lib/errors");
const generators = require("./lib/generators");
const utils_1 = require("./lib/utils");
// MODULE VARIABLES
// ================================================================================================
const DEFAULT_LIMITS = {
    maxTraceLength: 2 ** 20,
    maxInputRegisters: 32,
    maxStateRegisters: 64,
    maxStaticRegisters: 64,
    maxConstraintCount: 1024,
    maxConstraintDegree: 16
};
// PUBLIC FUNCTIONS
// ================================================================================================
async function instantiate(scriptOrPath, options = {}) {
    let script;
    if (Buffer.isBuffer(scriptOrPath)) {
        script = scriptOrPath.toString('utf8');
    }
    else {
        if (typeof scriptOrPath !== 'string') {
            throw new TypeError(`script path '${scriptOrPath}' is invalid`);
        }
        try {
            script = await fs_1.promises.readFile(scriptOrPath, { encoding: 'utf8' });
        }
        catch (error) {
            throw new errors_1.AirScriptError([error]);
        }
    }
    // apply default limits
    const limits = { ...DEFAULT_LIMITS, ...options.limits };
    const wasmOptions = options.wasmOptions;
    // build AIR module
    try {
        const specs = parseScript(script, limits, wasmOptions);
        const extensionFactor = validateExtensionFactor(specs.maxTransitionConstraintDegree, options.extensionFactor);
        const air = generators.instantiateJsModule(specs, limits, extensionFactor);
        return air;
    }
    catch (error) {
        throw new errors_1.AirScriptError([error]);
    }
}
exports.instantiate = instantiate;
function compile(script) {
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
    // build AIR module
    try {
        const schema = visitor_1.visitor.visit(cst);
        return schema;
    }
    catch (error) {
        throw new errors_1.AirScriptError([error]);
    }
}
exports.compile = compile;
// HELPER FUNCTIONS
// ================================================================================================
function parseScript(script, limits, wasmOptions) {
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
    // build and return script specs
    return visitor_1.visitor.visit(cst, { limits, wasmOptions });
}
// HELPER FUNCTIONS
// ================================================================================================
function validateExtensionFactor(constraintDegree, extensionFactor) {
    const minExtensionFactor = 2 ** Math.ceil(Math.log2(constraintDegree)) * 2;
    if (extensionFactor === undefined) {
        extensionFactor = minExtensionFactor;
        if (extensionFactor * 2 < constraintDegree) {
            extensionFactor = extensionFactor * 2;
        }
    }
    else {
        if (!Number.isInteger(extensionFactor))
            throw new TypeError('extension factor must be an integer');
        if (!utils_1.isPowerOf2(extensionFactor))
            throw new Error('extension factor must be a power of 2');
        if (extensionFactor < minExtensionFactor) {
            throw new Error(`extension factor cannot be smaller than ${minExtensionFactor}`);
        }
    }
    return extensionFactor;
}
//# sourceMappingURL=index.js.map