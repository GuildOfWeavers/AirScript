// IMPORTS
// ================================================================================================
import { Expression, JsCodeOptions } from '../Expression';
import { SymbolReference } from '../SymbolReference';
import { BinaryOperation } from '../operations/BinaryOperation';
import { SegmentLoopBlock } from './SegmentLoopBlock';
import { maxDegree, sumDegree } from '../utils';

// INTERFACES
// ================================================================================================
type BlockBody = InputBlock | SegmentLoopBlock;

// CLASS DEFINITION
// ================================================================================================
export class InputBlock extends Expression {

    readonly id             : number;
    readonly registers      : Set<number>;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(id: number, initExpression: Expression, bodyExpression: BlockBody, registers: Set<number>, controller: Expression) {
        if (!initExpression.isSameDimensions(bodyExpression)) {
            throw new Error(`init and body expressions must resolve to values of same dimensions`);
        }
        const degree = maxDegree(sumDegree(initExpression.degree, controller.degree), bodyExpression.degree);
        super(initExpression.dimensions, degree, [controller, initExpression, bodyExpression]);
        this.id = id;
        this.registers = registers;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get controller()    : Expression { return this.children[0]; }
    get initExpression(): Expression { return this.children[1]; }
    get bodyExpression(): InputBlock | SegmentLoopBlock { return this.children[2] as any; }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string, options: JsCodeOptions = {}): string {
        if (!assignTo) throw new Error('input loop cannot be reduced to unassigned code');
        
        const initVar = `init${this.id}`, bodyVar = `body${this.id}`;

        let code = `let ${initVar}, ${bodyVar};\n`;
        code += this.initExpression.toJsCode(initVar);
        code += this.bodyExpression.toJsCode(bodyVar);

        const iRef = new SymbolReference(initVar, this.initExpression.dimensions, this.initExpression.degree);
        const bRef = new SymbolReference(bodyVar, this.bodyExpression.dimensions, this.bodyExpression.degree);

        const result = BinaryOperation.add(BinaryOperation.mul(iRef, this.controller), bRef);
        code += result.toJsCode(assignTo, options);

        return `{\n${code}}\n`;
    }

    toAssembly(): string {
        return `(add (mul ${this.initExpression.toAssembly()} ${this.controller.toAssembly()}) ${this.bodyExpression.toAssembly()})\n`;
    }
}