// IMPORTS
// ================================================================================================
import { Expression, JsCodeOptions } from '../Expression';
import { SymbolReference } from '../SymbolReference';
import { BinaryOperation } from '../operations/BinaryOperation';
import { SegmentLoopBlock } from './SegmentLoopBlock';
import { maxDegree, sumDegree } from '../utils';

// CLASS DEFINITION
// ================================================================================================
export class InputBlock extends Expression {

    readonly controller     : Expression;
    readonly initExpression : Expression;
    readonly bodyExpression : InputBlock | SegmentLoopBlock;
    readonly registers      : Set<number>;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(initExpression: Expression, bodyExpression: InputBlock | SegmentLoopBlock, registers: Set<number>, controller: Expression) {
        if (!initExpression.isSameDimensions(bodyExpression)) {
            throw new Error(`init and body expressions must resolve to values of same dimensions`);
        }
        const degree = maxDegree(sumDegree(initExpression.degree, controller.degree), bodyExpression.degree);
        super(initExpression.dimensions, degree);
        this.controller = controller;
        this.initExpression = initExpression;
        this.bodyExpression = bodyExpression;
        this.registers = registers;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string, options: JsCodeOptions = {}): string {
        if (!assignTo) throw new Error('input loop cannot be reduced to unassigned code');
        
        let code = 'let init, body;\n';
        code += this.initExpression.toJsCode('init');
        code += this.bodyExpression.toJsCode('body');

        const iRef = new SymbolReference('init', this.initExpression.dimensions, this.initExpression.degree);
        const bRef = new SymbolReference('body', this.bodyExpression.dimensions, this.bodyExpression.degree);

        const result = BinaryOperation.add(BinaryOperation.mul(iRef, this.controller), bRef);
        code += result.toJsCode(assignTo, options);

        return `{\n${code}}\n`;
    }
}