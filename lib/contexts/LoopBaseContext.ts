// IMPORTS
// ================================================================================================
import { Expression } from "@guildofweavers/air-assembly";
import { Context, ExecutionContext } from "./Context";
import { validate } from "../utils";

// CLASS DECLARATION
// ================================================================================================
export class LoopBaseContext extends ExecutionContext {

    private _initResult?    : Expression;
    private _segmentResults : Expression[];
    private _result?        : Expression;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent: Context) {
        super(parent);
        this._segmentResults = [];
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get result(): Expression {
        validate(this._initResult !== undefined, errors.initResultNotYetSet());
        validate(this._segmentResults.length > 0, errors.segmentsNotYetSet());
        if (this._result) return this._result;

        // initializer result
        const controller = this.getLoopController(this.rank);
        let result: Expression = this.base.buildBinaryOperation('mul', this._initResult, controller);

        // segment results
        this._segmentResults.forEach((expression, i) => {
            const resultControl = this.getSegmentController(i);
            expression = this.base.buildBinaryOperation('mul', expression, resultControl);
            result = this.base.buildBinaryOperation('add', result, expression);
        });

        // store result in a local variable
        const resultHandle = `${this.id}t`; // TODO?
        this.base.addLocal(this._initResult.dimensions, resultHandle);  // TODO: better way to get dimensions
        this.statements.push(this.base.buildStoreOperation(resultHandle, result));

        this._result = this.base.buildLoadExpression(`load.local`, resultHandle);
        return this._result;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    setInitializer(initResult: Expression) {
        validate(this._initResult === undefined, errors.initResultAlreadySet());
        // TODO: validate against domain
        this._initResult = initResult;
    }

    addSegment(segmentResult: Expression) {
        // TODO: validate against domain
        this._segmentResults.push(segmentResult);
    }
}

// ERRORS
// ================================================================================================
const errors = {
    initResultAlreadySet    : () => `loop base initializer result has already been set`,
    initResultNotYetSet     : () => `loop base initializer result hasn't been set yet`,
    segmentsNotYetSet       : () => `loop base segments haven't been set yet`
};