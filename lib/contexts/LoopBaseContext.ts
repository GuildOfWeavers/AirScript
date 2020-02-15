// IMPORTS
// ================================================================================================
import { Interval } from "@guildofweavers/air-script";
import { Expression } from "@guildofweavers/air-assembly";
import { Context, ExecutionContext } from "./Context";

// CLASS DECLARATION
// ================================================================================================
export class LoopBaseContext extends ExecutionContext {

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent: Context, domain?: Interval) {
        super(parent, domain);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    buildResult(initResult: Expression, segmentResults: Expression[]): Expression {
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

        return this.base.buildLoadExpression(`load.local`, resultHandle);
    }
}