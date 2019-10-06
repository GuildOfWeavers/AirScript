"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsTemplate = require("../templates/JsModuleTemplate");
// PUBLIC FUNCTIONS
// ================================================================================================
function generateJsModule(specs, limits, extensionFactor) {
    let code = `'use strict';\n\n`;
    // set up module variables
    const maxConstraintDegree = specs.maxTransitionConstraintDegree;
    const compositionFactor = 2 ** Math.ceil(Math.log2(maxConstraintDegree));
    code += `const stateWidth = ${specs.mutableRegisterCount};\n`;
    code += `const extensionFactor = ${extensionFactor};\n`;
    code += `const compositionFactor = ${compositionFactor};\n`;
    code += `const maxTraceLength = ${limits.maxTraceLength};\n\n`;
    // build transition function and constraints
    code += `function applyTransition(r, k, s, p, c, i) {\n${buildTransitionFunctionBody(specs)}}\n`;
    code += `function evaluateConstraints(r, n, k, s, p, c, i) {\n${buildTransitionConstraintsBody(specs)}}\n\n`;
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
    code += `initProof,\n`;
    code += `initVerification\n`;
    code += '};';
    // create and execute module builder function
    const buildModule = new Function('f', 'g', 'registerSpecs', 'loopSpecs', 'constraints', code);
    return buildModule(specs.field, specs.constantBindings, buildRegisterSpecs(specs), buildLoopSpecs(specs), specs.transitionConstraintsSpecs);
}
exports.generateJsModule = generateJsModule;
// HELPER FUNCTIONS
// ================================================================================================
function buildTransitionFunctionBody(specs) {
    let code = 'let result;\n';
    code += specs.transitionFunction.toJsCode('result', undefined, specs.loopController);
    code += specs.transitionFunction.isScalar ? `return [result];\n` : `return result.values;\n`;
    return code;
}
function buildTransitionConstraintsBody(specs) {
    return 'return [];\n';
    //return specs.transitionConstraints.toJsCode(undefined, undefined, specs.loopController as any); // TODO
}
function buildLoopSpecs(specs) {
    return {
        traceTemplate: specs.loopController.inputTemplate,
        segmentMasks: specs.loopController.segmentMasks,
        baseCycleLength: specs.baseCycleLength
    };
}
function buildRegisterSpecs(specs) {
    return {
        k: specs.staticRegisters,
        s: specs.secretRegisters,
        p: specs.publicRegisters
    };
}
//# sourceMappingURL=jsGenerator.js.map