// IMPORTS
// ================================================================================================
import { Interval, FunctionInfo } from "@guildofweavers/air-script";
import { Expression } from "@guildofweavers/air-assembly";
import { Context, ExecutionContext } from "./ExecutionContext";
import { validate, areSameDimensions, ProcedureParams, isSubdomain } from "../utils";

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
        let result = (this.blocks.length === 1)
            ? this.blocks[0]
            : this.base.buildMakeVectorExpression(this.blocks);

        if (result.isScalar) {
            result = this.base.buildMakeVectorExpression([result]);
        }

        return result;
    }

    // PUBLIC METHODS
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

    addDelegateBlock(delegateName: string, inputs: Expression[], domain: Interval): void {
        
        const procedureName = this.procedureName;
        const funcName = `${delegateName}_${procedureName}`
        const info = this.symbols.get(funcName) as FunctionInfo;
        validate(info !== undefined, errors.undefinedFunctionRef(delegateName));
        validate(info.type === 'func', errors.invalidFunctionRef(delegateName));
        validate(isSubdomain(this.domain, domain), errors.invalidFunctionDomain(delegateName, this.domain));
        const depth = this.getMaxInputRank() - this.rank;
        validate(depth === info.rank, errors.invalidFunctionRank(funcName));
        validate(inputs.length === info.inputCount, errors.wrongFunctionParamCount(funcName, info.inputCount));

        // build function parameters
        const params: Expression[] = [];

        // add parameter for current state
        params.push(this.base.buildLoadExpression('load.param', ProcedureParams.thisTraceRow));
        if (domain[0] > 0 || domain[1] < this.traceWidth) {
            params[0] = this.base.buildSliceVectorExpression(params[0], domain[0], domain[1]);
        }

        // if we are in an evaluator, add next state as parameter as well
        if (procedureName === 'evaluation') {
            params.push(this.base.buildLoadExpression('load.param', ProcedureParams.nextTraceRow));
            if (domain[0] > 0 || domain[1] < this.traceWidth) {
                params[1] = this.base.buildSliceVectorExpression(params[1], domain[0], domain[1]);
            }
        }
        
        // build parameter for static registers
        const statics: Expression[] = [];
        statics.push(this.base.buildMakeVectorExpression(inputs));

        const masks = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
        const maskOffset = this.loopOffset + this.getLoopControllerIndex(this.getCurrentBlockPath());
        statics.push(this.base.buildSliceVectorExpression(masks, maskOffset, maskOffset + info.maskCount - 1));

        if (info.auxCount > 0) {
            const auxOffset = this.auxRegistersOffset + info.auxOffset;
            const aux = this.base.buildLoadExpression('load.param', ProcedureParams.staticRow);
            statics.push(this.base.buildSliceVectorExpression(aux, auxOffset, auxOffset + info.auxCount - 1));
        }

        params.push(this.base.buildMakeVectorExpression(statics));
        this.blocks.push(this.base.buildCallExpression(info.handle, params));
    }

    // PRIVATE METHODS
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

    getMaxInputRank(): number {
        let rank = 0;
        for (let input of this.inputs) {
            let inputRank = this.getInputRank(input);
            if (inputRank > rank) {
                rank = inputRank;
            }
        }
        return rank;
    }
}

// ERRORS
// ================================================================================================
const errors = {
    resultsNotYetSet        : () => `loop results haven't been set yet`,
    baseResultMismatch      : () => `init block dimensions conflict with segment block dimensions`,
    loopResultMismatch      : () => `init block dimensions conflict with inner loop dimensions`,
    undefinedFunctionRef    : (f: any) => `function ${f} has not been defined`,
    invalidFunctionRef      : (f: any) => `symbol ${f} is not a function`,
    invalidFunctionDomain   : (f: any, p: any) => `domain of function ${f} is outside of parent domain ${p}`,
    invalidFunctionRank     : (f: any) => `function ${f} cannot be called from the specified context: rank mismatch`,
    wrongFunctionParamCount : (f: any, c: any) => `invalid number of parameters for function ${f}, ${c} parameters expected`
};