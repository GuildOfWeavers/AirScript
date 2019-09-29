// IMPORTS
// ================================================================================================
import { FiniteField } from "@guildofweavers/galois";
import { Expression, TransitionBlock } from "./expressions";
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
    generateJsModule(tFunctionBody: TransitionBlock, tConstraintsBody: Expression): AirModule {

        // build transition function
        const tFunctionCode = `function transition (r, k, s, p) {\n${tFunctionBody.toJsCode()}}`;

        // build constraint evaluator
        let tEvaluatorCode = 'let result;\n'
        tEvaluatorCode += `${tConstraintsBody.toJsCode('result', { vectorAsArray: true })}`;
        tEvaluatorCode += (tConstraintsBody.isScalar ? 'return [result];\n' : 'return result;\n');
        tEvaluatorCode = `function evaluate (r, n, k, s, p) {\n${tEvaluatorCode}}`;

        // build and return the module
        let moduleCode = `'use strict';\n\n`;
        moduleCode += `${tFunctionCode}\n\n${tEvaluatorCode}\n\n`;
        moduleCode += `return { transition, evaluate };`
        const moduleBuilder = new Function('f', 'g', moduleCode);

        return moduleBuilder(this.field, this.constantBindings);
    }
}