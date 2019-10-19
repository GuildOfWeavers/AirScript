// IMPORTS
// ================================================================================================
import { AirModule, StarkLimits } from "@guildofweavers/air-script";
import { ScriptSpecs } from "../ScriptSpecs";
import * as jsTemplate from './JsModuleTemplate';

// PUBLIC FUNCTIONS
// ================================================================================================
export function instantiateModule(specs: ScriptSpecs, limits: StarkLimits, extensionFactor: number): AirModule {

    let code = `'use strict';\n\n`;

    // set up module variables
    const maxConstraintDegree = specs.maxTransitionConstraintDegree;
    const compositionFactor = 2**Math.ceil(Math.log2(maxConstraintDegree));

    code += `const stateWidth = ${specs.stateRegisterCount};\n`;
    code += `const extensionFactor = ${extensionFactor};\n`;
    code += `const compositionFactor = ${compositionFactor};\n`;
    code += `const maxTraceLength = ${limits.maxTraceLength};\n\n`;

    // build transition function and constraints
    code += `function applyTransition(r, k, i, c) {\n${specs.transitionFunction.toJsCode()}}\n`;
    code += `function evaluateConstraints(r, n, k, i, c) {\n${specs.transitionConstraints.toJsCode()}}\n\n`;

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
    code += `inputRegisters: inputRegisters,\n`;
    code += `staticRegisters: staticRegisters,\n`;
    code += `constraints: constraints,\n`;
    code += `maxConstraintDegree: ${specs.maxTransitionConstraintDegree},\n`;
    code += `initProof,\n`;
    code += `initVerification\n`;
    code += '};';

    // create and execute module builder function
    const buildModule = new Function('f', 'g', 'inputRegisters', 'staticRegisters', 'loops', 'constraints', code);
    return buildModule(
        specs.field,
        specs.constantBindings,
        specs.inputRegisters,
        specs.staticRegisters,
        specs.inputBlock,
        specs.transitionConstraintsSpecs,
    );
}