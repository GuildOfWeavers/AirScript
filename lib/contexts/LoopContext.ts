// IMPORTS
// ================================================================================================
import { Interval, FunctionInfo } from "@guildofweavers/air-script";
import { Expression } from "@guildofweavers/air-assembly";
import { Context, ExecutionContext } from "./ExecutionContext";
import { validate, areSameDimensions, ProcedureParams, TRANSITION_FN_POSTFIX } from "../utils";

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
    getLoopController(): Expression {
        const path = this.getCurrentBlockPath();
        const loopIdx = this.loopOffset + this.getLoopControllerIndex(path);
        let result: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, loopIdx);
        return result;
    }

    getSegmentController(segmentIdx: number): Expression {
        const path = this.getCurrentBlockPath();
        path.push(segmentIdx);
        segmentIdx = this.segmentOffset + this.getSegmentControllerIndex(path);
        let result: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, segmentIdx);
        return result;
    }

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

    addDelegateBlock(delegateName: string, inputs: Expression[], domain: Interval): void {
        // TODO: validate domain

        const procedureName = this.procedureName;

        const funcName = `${delegateName}_${procedureName}`
        const info = this.symbols.get(funcName) as FunctionInfo;
        validate(info !== undefined, errors.undefinedFuncReference(delegateName));
        validate(info.type === 'func', errors.invalidFuncReference(delegateName));
        // TODO: validate rank

        // build function parameters
        const params: Expression[] = [];

        // add parameter for current state
        params.push(this.base.buildLoadExpression('load.param', ProcedureParams.thisTraceRow));
        if (domain[0] > 0 || domain[1] < 10) { // TODO: get upper bound from somewhere
            params[0] = this.base.buildSliceVectorExpression(params[0], domain[0], domain[1]);
        }

        // if we are in an evaluator, add next state as parameter as well
        if (procedureName === 'evaluation') {
            params.push(this.base.buildLoadExpression('load.param', ProcedureParams.nextTraceRow));
            if (domain[0] > 0 || domain[1] < 10) { // TODO: get upper bound from somewhere
                params[1] = this.base.buildSliceVectorExpression(params[1], domain[0], domain[1]);
            }
        }
        
        // build parameter for static registers
        const statics: Expression[] = [];
        const controller = this.getLoopController();
        const inputsVector: Expression = this.base.buildMakeVectorExpression(inputs);
        statics.push(this.base.buildBinaryOperation('mul', inputsVector, controller));

        let masks: Expression = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
        const maskOffset = this.loopOffset + info.rank;
        const maskCount = 2 - info.rank; // TODO
        masks = this.base.buildSliceVectorExpression(masks, maskOffset, maskOffset + maskCount - 1);
        statics.push(masks);

        if (info.auxLength > 0) {
            const auxOffset = this.auxRegistersOffset + info.auxOffset;
            const aux = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
            statics.push(this.base.buildSliceVectorExpression(aux, auxOffset, auxOffset + info.auxLength - 1));
        }

        params.push(this.base.buildMakeVectorExpression(statics));
        this.blocks.push(this.base.buildCallExpression(info.handle, params));
    }
}

// ERRORS
// ================================================================================================
const errors = {
    resultsNotYetSet        : () => `loop results haven't been set yet`,
    baseResultMismatch      : () => `init block dimensions conflict with segment block dimensions`,
    loopResultMismatch      : () => `init block dimensions conflict with inner loop dimensions`,
    invalidFuncReference    : (f: any) => `symbol ${f} is not a function`,
    undefinedFuncReference  : (f: any) => `function ${f} has not been defined`,
};