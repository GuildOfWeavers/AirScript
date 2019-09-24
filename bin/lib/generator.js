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
    generateTransitionFunction(statements) {
        this.validateTransitionStatements(statements);
        let code = 'let result;\n';
        code += `${statements.toAssignment('result')}\n`;
        code += (statements.isScalar ? 'return [result];\n' : 'return result.values;\n');
        let functionBuilderCode = `'use strict';\n\n`;
        functionBuilderCode += `return function (r, k, s, p) {\n${code}}`;
        const buildFunction = new Function('f', 'g', functionBuilderCode);
        return buildFunction(this.field, this.constantBindings);
    }
    generateConstraintEvaluator(statements) {
        this.validateConstraintStatements(statements);
        let code = 'let result;\n';
        code += `${statements.toAssignment('result')}\n`;
        code += (statements.isScalar ? 'return [result];\n' : 'return result.values;\n');
        let evaluatorBuilderCode = `'use strict';\n\n`;
        evaluatorBuilderCode += `return function (r, n, k, s, p) {\n${code}}`;
        const buildEvaluator = new Function('f', 'g', evaluatorBuilderCode);
        return buildEvaluator(this.field, this.constantBindings);
    }
    // VALIDATORS
    // --------------------------------------------------------------------------------------------
    validateTransitionStatements(statements) {
        if (this.mutableRegisterCount === 1) {
            if (!statements.isScalar && (!statements.isVector || statements.dimensions[0] !== 1)) {
                throw new Error(`Transition function must evaluate to scalar or to a vector of exactly 1 value`);
            }
        }
        else {
            if (!statements.isVector || statements.dimensions[0] !== this.mutableRegisterCount) {
                throw new Error(`Transition function must evaluate to a vector of exactly ${this.mutableRegisterCount} values`);
            }
        }
    }
    validateConstraintStatements(statements) {
        if (this.constraintCount === 1) {
            if (!statements.isScalar && (!statements.isVector || statements.dimensions[0] !== 1)) {
                throw new Error(`Transition constraints must evaluate to scalar or to a vector of exactly 1 value`);
            }
        }
        else {
            if (!statements.isVector || statements.dimensions[0] !== this.constraintCount) {
                throw new Error(`Transition constraints must evaluate to a vector of exactly ${this.constraintCount} values`);
            }
        }
    }
}
exports.CodeGenerator = CodeGenerator;
//# sourceMappingURL=generator.js.map