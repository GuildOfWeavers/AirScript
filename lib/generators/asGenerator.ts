// IMPORTS
// ================================================================================================
import { StarkLimits } from "@guildofweavers/air-script";
import { ScriptSpecs } from "../ScriptSpecs";

// PUBLIC FUNCTIONS
// ================================================================================================
export function generateAssembly(specs: ScriptSpecs, limits: StarkLimits, extensionFactor: number): string {
    const tFunction = specs.transitionFunction.toAssembly();
    return tFunction;
}