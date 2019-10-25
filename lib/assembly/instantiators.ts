import { ModuleInfo, TransitionBody } from "./ModuleInfo";
import { Dimensions } from "../utils";


export function instantiateJsModule(assembly: ModuleInfo): any {

    let code = buildFunctionBody(assembly.transitionFunctionLocals, assembly.transitionFunctionBody);
    
    return code;
}

function buildFunctionBody(locals: Dimensions[], body: TransitionBody): string {
    let code = `let ${locals.map((l, i) => 'v' + i).join(', ')};\n`;
    code += body.statements.map(s => s.toJsCode()).join('');
    code += `return ${body.output.toJsCode({ vectorAsArray: true })};`;
    return `function applyTransition(r, k, i) {\n${code}\n}`;
}