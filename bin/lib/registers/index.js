"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RepeatRegister_1 = require("./RepeatRegister");
const SpreadRegister_1 = require("./SpreadRegister");
// PUBLIC FUNCTIONS
// ================================================================================================
function buildReadonlyRegisters(specs, ctx) {
    const registers = [];
    for (let s of specs) {
        if (s.pattern === 'repeat') {
            let register = new RepeatRegister_1.RepeatRegister(s.values, ctx);
            registers.push(register);
        }
        else if (s.pattern === 'spread') {
            let register = new SpreadRegister_1.SpreadRegister(s.values, ctx);
            registers.push(register);
        }
        else {
            throw new TypeError(`Invalid value pattern '${s.pattern}'`);
        }
    }
    return registers;
}
exports.buildReadonlyRegisters = buildReadonlyRegisters;
function buildInputRegisters(inputs, specs, isSecret, ctx) {
    const regSpecs = new Array(inputs.length);
    for (let i = 0; i < inputs.length; i++) {
        let binary = specs[i].binary;
        if (binary) {
            validateBinaryValues(inputs[i], ctx.field, isSecret, i);
        }
        regSpecs[i] = { values: inputs[i], pattern: specs[i].pattern, binary };
    }
    return buildReadonlyRegisters(regSpecs, ctx);
}
exports.buildInputRegisters = buildInputRegisters;
// EVALUATOR BUILDERS
// ================================================================================================
function buildReadonlyRegisterEvaluators(specs, ctx) {
    const registers = [];
    for (let s of specs) {
        if (s.pattern === 'repeat') {
            registers.push(RepeatRegister_1.RepeatRegister.buildEvaluator(s.values, ctx));
        }
        else if (s.pattern === 'spread') {
            registers.push(SpreadRegister_1.SpreadRegister.buildEvaluator(s.values, ctx));
        }
        else {
            throw new TypeError(`Invalid value pattern '${s.pattern}'`);
        }
    }
    return registers;
}
exports.buildReadonlyRegisterEvaluators = buildReadonlyRegisterEvaluators;
function buildInputRegisterEvaluators(inputs, specs, isSecret, ctx) {
    const regSpecs = new Array(inputs.length);
    for (let i = 0; i < inputs.length; i++) {
        let binary = specs[i].binary;
        if (binary) {
            validateBinaryValues(inputs[i], ctx.field, isSecret, i);
        }
        regSpecs[i] = { values: inputs[i], pattern: specs[i].pattern, binary };
    }
    return buildReadonlyRegisterEvaluators(regSpecs, ctx);
}
exports.buildInputRegisterEvaluators = buildInputRegisterEvaluators;
// HELPER FUNCTIONS
// ================================================================================================
function validateBinaryValues(values, field, isSecret, i) {
    for (let value of values) {
        if (value !== field.zero && value !== field.one) {
            let registerName = isSecret ? `$s${i}` : `$p${i}`;
            throw new Error(`Invalid definition for readonly register ${registerName}: the register can contain only binary values`);
        }
    }
}
//# sourceMappingURL=index.js.map