"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function instantiateJsModule(assembly) {
    let code = buildFunctionBody(assembly.transitionFunctionLocals, assembly.transitionFunctionBody);
    return code;
}
exports.instantiateJsModule = instantiateJsModule;
function buildFunctionBody(locals, body) {
    let code = `let ${locals.map((l, i) => 'v' + i).join(', ')};\n`;
    code += body.statements.map(s => s.toJsCode()).join('');
    code += `return ${body.output.toJsCode({ vectorAsArray: true })};`;
    return `function applyTransition(r, k, i) {\n${code}\n}`;
}
//# sourceMappingURL=instantiators.js.map