"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// PUBLIC FUNCTIONS
// ================================================================================================
function generateAssembly(specs, limits, extensionFactor) {
    const tFunction = specs.transitionFunction.toAssembly();
    return tFunction;
}
exports.generateAssembly = generateAssembly;
//# sourceMappingURL=asGenerator.js.map