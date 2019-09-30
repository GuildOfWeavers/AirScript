"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsTemplate = require("../templates/JsModuleTemplate");
// PUBLIC FUNCTIONS
// ================================================================================================
function generateJsModule(specs, extensionFactor) {
    let code = `'use strict';\n\n`;
    // set up module variables
    const maxConstraintDegree = specs.maxTransitionConstraintDegree;
    const compositionFactor = 2 ** Math.ceil(Math.log2(maxConstraintDegree));
    code += `const stateWidth = ${specs.mutableRegisterCount};\n`;
    code += `const extensionFactor = ${extensionFactor};\n`;
    code += `const compositionFactor = ${compositionFactor};\n`;
    code += `const baseCycleLength = ${getBaseCycleLength(specs)};\n\n`;
    // build transition function and constraints
    code += `function applyTransition(r, k, s, p, c) {\n${specs.transitionFunction.toJsCode()}}\n\n`;
    // TODO: transition constraints
    // add functions from the template
    for (let prop in jsTemplate) {
        code += `${jsTemplate[prop].toString()}\n`;
    }
    code += '\n';
    // build return object
    code += 'return {\n';
    code += `name: \`${specs.name}\`,\n`;
    code += `field: f,\n`;
    code += `stateWidth: stateWidth,\n`;
    code += `publicInputCount: ${specs.publicRegisters.length},\n`;
    code += `secretInputCount: ${specs.secretRegisters.length},\n`;
    code += `maxConstraintDegree: ${specs.maxTransitionConstraintDegree},\n`;
    code += `createContext\n`;
    code += '};';
    // create and execute module builder function
    const moduleBuilder = new Function('f', 'g', 'registerSpecs', 'constraints', code);
    return moduleBuilder(specs.field, specs.constantBindings, buildRegisterSpecs(specs), specs.transitionConstraintsSpecs);
}
exports.generateJsModule = generateJsModule;
// HELPER FUNCTIONS
// ================================================================================================
function getBaseCycleLength(specs) {
    return specs.transitionFunction.cycleLength;
}
function buildRegisterSpecs(specs) {
    return {
        k: specs.staticRegisters,
        s: specs.secretRegisters,
        p: specs.publicRegisters,
        c: [] // TODO
    };
}
//# sourceMappingURL=jsGenerator.js.map