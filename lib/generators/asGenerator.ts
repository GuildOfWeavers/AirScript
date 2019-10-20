// IMPORTS
// ================================================================================================
import { StarkLimits } from "@guildofweavers/air-script";
import { ScriptSpecs } from "../ScriptSpecs";

// PUBLIC FUNCTIONS
// ================================================================================================
export function generateAssembly(specs: ScriptSpecs, limits: StarkLimits, extensionFactor: number): string {
        
    // name and field
    const name = `(name ${specs.name})\n`;
    const field = `(field prime ${(specs.field as any).modulus})\n`;

    // global constants
    let constants = '';
    for (let [name, expression] of specs.globalConstants) {
        constants += `(const ${expression.toAssembly()})\n`;
    }

    // inputs
    let inputs = '';
    for (let register of specs.transitionFunction.inputRegisterSpecs) {
        inputs += `(input rank ${register})\n`;
    }

    // transition function and constraints
    const tFunction = specs.transitionFunction.toAssembly();
    const tConstraints = specs.transitionConstraints.toAssembly();

    // static section
    let kRegisters = '';
    if (specs.staticRegisters.length > 0) {
        for (let register of specs.staticRegisters) {
            let binary = register.binary ? ' binary' : '';
            kRegisters += `  (${register.pattern}${binary} (${register.values.join(' ')}))\n`;
        }
        kRegisters = `(static\n${kRegisters})`;
    }

    return `(stark ${name}${field}${constants}${inputs}${tFunction}${tConstraints}${kRegisters})`;
}