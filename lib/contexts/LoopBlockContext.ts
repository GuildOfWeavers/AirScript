// IMPORTS
// ================================================================================================
import { TraceDomain } from "@guildofweavers/air-script";
import { Expression } from "@guildofweavers/air-assembly";
import { Context, ExecutionContext } from "./Context";
import { validate } from "../utils";

// CLASS DEFINITION
// ================================================================================================
export class LoopBlockContext extends ExecutionContext {

    private _initResult?    : Expression;
    private _loopResult?    : Expression;
    private _result?        : Expression;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent: Context, domain?: TraceDomain) {
        super(parent, domain);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get result(): Expression {
        validate(this._initResult !== undefined, errors.initResultNotYetSet());
        validate(this._loopResult !== undefined, errors.loopResultNotYetSet());
        if (this._result) return this._result;

        // initializer result
        const controller = this.getLoopController(this.rank);
        const iResult = this.base.buildBinaryOperation('mul', this._initResult, controller);

        // loop result
        const one = this.base.buildLiteralValue(this.base.field.one);
        const invController = this.base.buildBinaryOperation('sub', one, controller);
        const lResult = this.base.buildBinaryOperation('mul', this._loopResult, invController);

        // combine results and store them in a local variable
        const resultHandle = `${this.id}t`; // TODO?
        this.base.addLocal(this._initResult.dimensions, resultHandle);  // TODO: better way to get dimensions
        const result = this.base.buildBinaryOperation('add', iResult, lResult);
        this.statements.push(this.base.buildStoreOperation(resultHandle, result));

        this._result = this.base.buildLoadExpression(`load.local`, resultHandle);
        return this._result;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    setInitializer(initResult: Expression): void {
        validate(this._initResult === undefined, errors.initResultAlreadySet());
        // TODO: validate against domain
        this._initResult = initResult;
    }

    setLoopResult(loopResult: Expression): void {
        validate(this._loopResult === undefined, errors.loopResultAlreadySet());
        // TODO: validate against domain
        this._loopResult = loopResult;
    }
}

// ERRORS
// ================================================================================================
const errors = {
    initResultAlreadySet    : () => `loop initializer result has already been set`,
    initResultNotYetSet     : () => `loop initializer result hasn't been set yet`,
    loopResultAlreadySet    : () => `loop block result has already been set`,
    loopResultNotYetSet     : () => `loop block result hasn't been set yet`
};