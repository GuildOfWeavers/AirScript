// IMPORTS
// ================================================================================================
import { TraceDomain } from "@guildofweavers/air-script";
import { Expression } from "@guildofweavers/air-assembly";
import { Context, ExecutionContext } from "./Context";
import { LoopContext } from "./LoopContext";

// CLASS DEFINITION
// ================================================================================================
export class LoopBlockContext extends ExecutionContext {

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(parent: Context, domain?: TraceDomain) {
        super(parent, domain);
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    buildResult(initResult: Expression, loopResult: Expression): Expression {
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

        return this.base.buildLoadExpression(`load.local`, resultHandle);
    }
}