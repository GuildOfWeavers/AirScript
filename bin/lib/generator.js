"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// ================================================================================================
class CodeGenerator {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(specs) {
        this.field = specs.field.jsField;
        this.mutableRegisterCount = specs.mutableRegisterCount;
        this.constraintCount = specs.constraintCount;
        this.constantBindings = specs.constantBindings;
    }
    // CODE GENERATORS
    // --------------------------------------------------------------------------------------------
    generateJsModule(tFunctionBody, tConstraintsBody) {
        // build transition function
        let tFunctionCode = 'let result;\n';
        tFunctionCode += `${tFunctionBody.toJsCode('result', { vectorAsArray: true })}`;
        tFunctionCode += (tFunctionBody.isScalar ? 'return [result];\n' : 'return result;\n');
        tFunctionCode = `function transition (r, k, s, p) {\n${tFunctionCode}}`;
        // build constraint evaluator
        let tEvaluatorCode = 'let result;\n';
        tEvaluatorCode += `${tConstraintsBody.toJsCode('result', { vectorAsArray: true })}`;
        tEvaluatorCode += (tConstraintsBody.isScalar ? 'return [result];\n' : 'return result;\n');
        tEvaluatorCode = `function evaluate (r, n, k, s, p) {\n${tEvaluatorCode}}`;
        // build and return the module
        let moduleCode = `'use strict';\n\n`;
        moduleCode += `${tFunctionCode}\n\n${tEvaluatorCode}\n\n`;
        moduleCode += `return { transition, evaluate };`;
        const moduleBuilder = new Function('f', 'g', moduleCode);
        return moduleBuilder(this.field, this.constantBindings);
    }
}
exports.CodeGenerator = CodeGenerator;
//# sourceMappingURL=generator.js.map