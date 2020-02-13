// IMPORTS
// ================================================================================================
import { Expression } from "@guildofweavers/air-assembly";
import { Context, ExecutionContext } from "./Context";
import { validate } from "../utils";

// CLASS DEFINITION
// ================================================================================================
export class LoopContext extends ExecutionContext {

    readonly blockResults   : Expression[];
    readonly rank           : number;

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
    addBlock(blockResult: Expression): void {
        // TODO: validate blockResult expression
        this.blockResults.push(blockResult);
    }
}

// ERRORS
// ================================================================================================
const errors = {
    resultsNotYetSet    : () => `loop results haven't been set yet`
};