"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsTemplate = require("./JsModuleTemplate");
// PUBLIC FUNCTIONS
// ================================================================================================
function instantiateModule(specs, limits, extensionFactor) {
    let code = `'use strict';\n\n`;
    // set up module variables
    const maxConstraintDegree = specs.maxTransitionConstraintDegree;
    const compositionFactor = 2 ** Math.ceil(Math.log2(maxConstraintDegree));
    code += `const stateWidth = ${specs.mutableRegisterCount};\n`;
    code += `const extensionFactor = ${extensionFactor};\n`;
    code += `const compositionFactor = ${compositionFactor};\n`;
    code += `const maxTraceLength = ${limits.maxTraceLength};\n\n`;
    // build transition function and constraints
    code += `function applyTransition(r, k, s, p, c, i) {\n${specs.transitionFunction.toJsCode()}}\n`;
    code += `function evaluateConstraints(r, n, k, s, p, c, i) {\n${specs.transitionConstraints.toJsCode()}}\n\n`;
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
    code += `iRegisterCount: ${specs.inputRegisterCount},\n`;
    code += `pRegisterCount: ${specs.publicRegisters.length},\n`;
    code += `sRegisterCount: ${specs.secretRegisters.length},\n`;
    code += `kRegisterCount: ${specs.staticRegisters.length},\n`;
    code += `constraints: constraints,\n`;
    code += `maxConstraintDegree: ${specs.maxTransitionConstraintDegree},\n`;
    code += `extensionFactor: extensionFactor,\n`;
    code += `initProof,\n`;
    code += `initVerification\n`;
    code += '};';
    // create and execute module builder function
    const buildModule = new Function('f', 'g', 'registerSpecs', 'loops', 'constraints', code);
    return buildModule(specs.field, specs.constantBindings, specs.readonlyRegisters, specs.inputBlock, specs.transitionConstraintsSpecs);
}
exports.instantiateModule = instantiateModule;
//# sourceMappingURL=jsGenerator.js.map