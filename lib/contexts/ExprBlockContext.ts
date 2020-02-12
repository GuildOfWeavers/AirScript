// IMPORTS
// ================================================================================================
import { Expression } from "@guildofweavers/air-assembly";
import { Context, ExecutionContext } from "./Context";
import { validate } from "../utils";

// CLASS DEFINITION
// ================================================================================================
export class ExprBlockContext extends ExecutionContext {

    private _result?: Expression;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(id: string, parent: Context) {
        super(id, parent);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get result(): Expression {
        validate(this._result !== undefined, errors.resultNotYetSet());
        return this._result;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    setResult(blockResult: Expression): void {
        validate(this._result === undefined, errors.resultAlreadySet());
        this._result = blockResult;
    }
}

// ERRORS
// ================================================================================================
const errors = {
    resultAlreadySet    : () => `block result has already been set`,
    resultNotYetSet     : () => `block result hasn't been set yet`
};