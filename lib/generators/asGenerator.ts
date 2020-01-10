// IMPORTS
// ================================================================================================
import { StarkLimits } from "@guildofweavers/air-script";

// PUBLIC FUNCTIONS
// ================================================================================================
export function generateAssembly(specs: any, limits: StarkLimits, extensionFactor: number): string {
        
    // name and field
    const name = `(name ${specs.name})\n`;
    const field = `(field prime ${(specs.field as any).modulus})\n`;

    // global constants
    let constants = '';
    for (let cName in specs.constantBindings) {
        constants += `(const ${specs.constantBindings[cName]})\n`;
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
    let fixedRegisters = '';
    if (specs.staticRegisters.length > 0) {
        for (let register of specs.staticRegisters) {
            let binary = register.binary ? ' binary' : '';
            fixedRegisters += `  (fixed ${register.pattern}${binary} (${register.values.join(' ')}))\n`;
        }
    }

    return `(stark ${name}${field}${constants}${inputs}${tFunction}${tConstraints}${fixedRegisters})`;
}