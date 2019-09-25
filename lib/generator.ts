// IMPORTS
// ================================================================================================
import { FiniteField } from "@guildofweavers/galois";
import { StatementBlock } from "./expressions";
import { ScriptSpecs } from "./ScriptSpecs";
import { TransitionFunction, ConstraintEvaluator } from "./AirObject";

// INTERFACES
// ================================================================================================
export interface AirModule {
    transition  : TransitionFunction;
    evaluate    : ConstraintEvaluator;
}

// CLASS DEFINITION
// ================================================================================================
export class CodeGenerator {

    readonly field                  : FiniteField;
    readonly mutableRegisterCount   : number;
    readonly constraintCount        : number;
    readonly constantBindings       : any;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(specs: ScriptSpecs) {
        this.field = specs.field.jsField;
        this.mutableRegisterCount = specs.mutableRegisterCount;
        this.constraintCount = specs.constraintCount;
        this.constantBindings = specs.constantBindings;
    }

    // CODE GENERATORS
    // --------------------------------------------------------------------------------------------
    generateJsModule(tFunctionBody: StatementBlock, tConstraintsBody: StatementBlock): AirModule {

        // build transition function
        let tFunctionCode = 'let result;\n'
        tFunctionCode += `${tFunctionBody.toAssignment('result')}`;
        tFunctionCode += (tFunctionBody.isScalar ? 'return [result];\n' : 'return result.values;\n');
        tFunctionCode = `function transition (r, k, s, p) {\n${tFunctionCode}}`;

        // build constraint evaluator
        let tEvaluatorCode = 'let result;\n'
        tEvaluatorCode += `${tConstraintsBody.toAssignment('result')}`;
        tEvaluatorCode += (tConstraintsBody.isScalar ? 'return [result];\n' : 'return result.values;\n');
        tEvaluatorCode = `function evaluate (r, n, k, s, p) {\n${tEvaluatorCode}}`;

        // build and return the module
        let moduleCode = `'use strict';\n\n`;
        moduleCode += `${tFunctionCode}\n\n${tEvaluatorCode}\n\n`;
        moduleCode += `return { transition, evaluate };`
        const moduleBuilder = new Function('f', 'g', moduleCode);

        return moduleBuilder(this.field, this.constantBindings);
    }
}