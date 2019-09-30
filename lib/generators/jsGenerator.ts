// IMPORTS
// ================================================================================================
import { AirModule } from "@guildofweavers/air-script";
import { ScriptSpecs } from "../ScriptSpecs";
import * as jsTemplate from '../templates/JsModuleTemplate';

// PUBLIC FUNCTIONS
// ================================================================================================
export function generateJsModule(specs: ScriptSpecs, extensionFactor: number): AirModule {

    let code = `'use strict';\n\n`;

    // set up module variables
    const maxConstraintDegree = specs.maxTransitionConstraintDegree;
    const compositionFactor = 2**Math.ceil(Math.log2(maxConstraintDegree));

    code += `const stateWidth = ${specs.mutableRegisterCount};\n`;
    code += `const extensionFactor = ${extensionFactor};\n`;
    code += `const compositionFactor = ${compositionFactor};\n`;
    code += `const baseCycleLength = ${specs.baseCycleLength};\n\n`;

    // build transition function and constraints
    const lc = specs.loopController;
    code += `function applyTransition(r, k, s, p, c) {\n${specs.transitionFunction.toJsCode(undefined, undefined, lc)}}\n`;
    code += `function evaluateConstraints(r, n, k, s, p, c) {\n${specs.transitionConstraints.toJsCode(undefined, undefined, lc)}}\n\n`;

    // add functions from the template
    for (let prop in jsTemplate) {
        code += `${(jsTemplate as any)[prop].toString()}\n`;
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
    const moduleBuilder = new Function('f', 'g', 'registerSpecs', 'constraints', code);
    return moduleBuilder(
        specs.field,
        specs.constantBindings,
        buildRegisterSpecs(specs),
        specs.transitionConstraintsSpecs,
    );
}

// HELPER FUNCTIONS
// ================================================================================================
function buildRegisterSpecs(specs: ScriptSpecs): jsTemplate.RegisterSpecs {
    return {
        k: specs.staticRegisters,
        s: specs.secretRegisters,
        p: specs.publicRegisters,
        c: specs.controlRegisters
    };
}