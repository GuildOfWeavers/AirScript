// IMPORTS
// ================================================================================================
import { Expression } from "@guildofweavers/air-assembly";
import { Context, ExecutionContext } from "./ExecutionContext";
import { validate } from "../utils";

// CLASS DEFINITION
// ================================================================================================
export class LoopContext extends ExecutionContext {

    readonly rank           : number;
    readonly blockResults   : Expression[];
    
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent: Context, inputs: string[]) {
        super(parent, undefined, inputs);
        this.blockResults = [];
        this.rank = (parent instanceof ExecutionContext ? parent.rank + 1: 0);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get result(): Expression {
        validate(this.blockResults.length > 0, errors.resultsNotYetSet());

        let result: Expression;
        if (this.blockResults.length === 1) {
            result = this.blockResults[0];
        }
        else {
            result = this.base.buildMakeVectorExpression(this.blockResults);
        }
        
        // TODO: check domain consistency of the results

        return result;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    setInputs(inputs: string[]): void {
        // TODO: implement
    }

    addBaseBlock(initResult: Expression, segmentResults: Expression[]): void {
        // initializer result
        const controller = this.getLoopController(this.rank);
        let result: Expression = this.base.buildBinaryOperation('mul', initResult, controller);

        // segment results
        segmentResults.forEach((expression, i) => {
            const resultControl = this.getSegmentController(i);
            expression = this.base.buildBinaryOperation('mul', expression, resultControl);
            result = this.base.buildBinaryOperation('add', result, expression);
        });

        // store result in a local variable
        const resultHandle = `${this.id}t`; // TODO?
        this.base.addLocal(initResult.dimensions, resultHandle);  // TODO: better way to get dimensions
        this.statements.push(this.base.buildStoreOperation(resultHandle, result));

        this.blockResults.push(this.base.buildLoadExpression(`load.local`, resultHandle));
    }

    addLoopBlock(initResult: Expression, loopResult: Expression): void {
        // TODO: validate dimensions

        const id = this.getLoopControllerId();

        // initializer result
        const controller = this.getLoopController(this.rank);
        initResult = this.base.buildBinaryOperation('mul', initResult, controller);

        // loop result
        const one = this.base.buildLiteralValue(this.base.field.one);
        const invController = this.base.buildBinaryOperation('sub', one, controller);
        loopResult = this.base.buildBinaryOperation('mul', loopResult, invController);

        // combine results and store them in a local variable
        const resultHandle = `${this.id}t`; // TODO?
        this.base.addLocal(initResult.dimensions, resultHandle);  // TODO: better way to get dimensions
        const result = this.base.buildBinaryOperation('add', initResult, loopResult);
        this.statements.push(this.base.buildStoreOperation(resultHandle, result));

        this.blockResults.push(this.base.buildLoadExpression(`load.local`, resultHandle));
    }
}

// ERRORS
// ================================================================================================
const errors = {
    resultsNotYetSet    : () => `loop results haven't been set yet`
};