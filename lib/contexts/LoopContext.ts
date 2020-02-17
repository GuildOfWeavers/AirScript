// IMPORTS
// ================================================================================================
import { Expression } from "@guildofweavers/air-assembly";
import { Context, ExecutionContext } from "./ExecutionContext";
import { validate, areSameDimensions } from "../utils";

// CLASS DEFINITION
// ================================================================================================
export class LoopContext extends ExecutionContext {

    readonly rank   : number;
    readonly blocks : Expression[];
    
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent: Context, inputs: string[]) {
        super(parent, undefined, inputs);
        this.blocks = [];
        this.rank = (parent instanceof ExecutionContext ? parent.rank + 1: 0);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get result(): Expression {
        validate(this.blocks.length > 0, errors.resultsNotYetSet());
        const result = (this.blocks.length === 1)
            ? this.blocks[0]
            : this.base.buildMakeVectorExpression(this.blocks)
        return result;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    addBaseBlock(initResult: Expression, segmentResults: Expression[]): void {

        const dimensions = initResult.dimensions;

        // initializer result
        const controller = this.getLoopController();
        let result: Expression = this.base.buildBinaryOperation('mul', initResult, controller);

        // segment results
        segmentResults.forEach((expression, i) => {
            validate(areSameDimensions(dimensions, expression.dimensions), errors.baseResultMismatch());
            const resultControl = this.getSegmentController(i);
            expression = this.base.buildBinaryOperation('mul', expression, resultControl);
            result = this.base.buildBinaryOperation('add', result, expression);
        });

        // store result in a local variable
        this.base.addLocal(dimensions, this.id);
        this.statements.push(this.base.buildStoreOperation(this.id, result));

        this.blocks.push(this.base.buildLoadExpression(`load.local`, this.id));
    }

    addLoopBlock(initResult: Expression, loopResult: Expression): void {

        const dimensions = initResult.dimensions;
        validate(areSameDimensions(dimensions, loopResult.dimensions), errors.loopResultMismatch());

        // initializer result
        const controller = this.getLoopController();
        initResult = this.base.buildBinaryOperation('mul', initResult, controller);

        // loop result
        const one = this.base.buildLiteralValue(this.base.field.one);
        const invController = this.base.buildBinaryOperation('sub', one, controller);
        loopResult = this.base.buildBinaryOperation('mul', loopResult, invController);

        // combine results and store them in a local variable
        this.base.addLocal(dimensions, this.id);
        const result = this.base.buildBinaryOperation('add', initResult, loopResult);
        this.statements.push(this.base.buildStoreOperation(this.id, result));

        this.blocks.push(this.base.buildLoadExpression(`load.local`, this.id));
    }
}

// ERRORS
// ================================================================================================
const errors = {
    resultsNotYetSet    : () => `loop results haven't been set yet`,
    baseResultMismatch  : () => `init block dimensions conflict with segment block dimensions`,
    loopResultMismatch  : () => `init block dimensions conflict with inner loop dimensions`
};