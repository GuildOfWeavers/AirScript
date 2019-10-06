// IMPORTS
// ================================================================================================
import { Expression, JsCodeOptions } from '../Expression';
import { SymbolReference } from '../SymbolReference';
import { BinaryOperation } from '../operations/BinaryOperation';
import { SegmentLoopBlock } from './SegmentLoopBlock';
import { LoopController } from './LoopController';
import { maxDegree, sumDegree } from '../utils';

// CLASS DEFINITION
// ================================================================================================
export class InputLoop extends Expression {

    readonly modifierId     : number;
    readonly initExpression : Expression;
    readonly bodyExpression : InputLoop | SegmentLoopBlock;
    readonly registers      : Set<number>;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(initExpression: Expression, bodyExpression: InputLoop | SegmentLoopBlock, registers: Set<number>, modifierId: number, modifierDegree: bigint) {
        if (!initExpression.isSameDimensions(bodyExpression)) {
            throw new Error(`init and body expressions must resolve to values of same dimensions`);
        }
        const degree = maxDegree(sumDegree(initExpression.degree, modifierDegree), bodyExpression.degree);
        super(initExpression.dimensions, degree);
        this.modifierId = modifierId;
        this.initExpression = initExpression;
        this.bodyExpression = bodyExpression;
        this.registers = registers;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string, options: JsCodeOptions = {}, controller?: LoopController): string {
        if (!assignTo) throw new Error('input loop cannot be reduced to unassigned code');
        if (!controller) throw new Error('input loop cannot be reduced to code without a loop controller');
        
        let code = 'let init, body;\n';
        code += this.initExpression.toJsCode('init');
        code += this.bodyExpression.toJsCode('body', options, controller);

        const iRef = new SymbolReference('init', this.initExpression.dimensions, this.initExpression.degree);
        const bRef = new SymbolReference('body', this.bodyExpression.dimensions, this.bodyExpression.degree);

        const modifier = controller.getModifier(this.modifierId)!;

        const result = BinaryOperation.add(BinaryOperation.mul(iRef, modifier), bRef);
        code += result.toJsCode(assignTo, options);

        return `{\n${code}}\n`;
    }
}