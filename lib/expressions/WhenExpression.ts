// IMPORTS
// ================================================================================================
import { Expression } from './Expression';
import { StatementBlock } from './StatementBlock';
import { BinaryOperation } from './operations/BinaryOperation';
import { VariableReference } from './VariableReference';
import { RegisterReference } from './RegisterReference';
import { sumDegree, maxDegree } from './degreeUtils';

// MODULE VARIABLES
// ================================================================================================
const ONE = new VariableReference('f.one', [0, 0], 0n);

// CLASS DEFINITION
// ================================================================================================
export class WhenExpression extends Expression {

    readonly condition  : Expression;
    readonly tBlock     : StatementBlock;
    readonly fBlock     : StatementBlock;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(condition: Expression, tBlock: StatementBlock, fBlock: StatementBlock) {
        if (!tBlock.isSameDimensions(fBlock)) {
            throw new Error(`when...else statement branches must evaluate to values of same dimensions`);
        }

        const tDegree = sumDegree(tBlock.degree, condition.degree);
        const fDegree = sumDegree(fBlock.degree, condition.degree);
        const degree = maxDegree(tDegree, fDegree);

        super(tBlock.dimensions, degree);
        this.condition = condition;
        this.tBlock = tBlock;
        this.fBlock = fBlock;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toAssignment(target: string): string {
        const tVal = 'tVal', fVal = 'fVal';

        // evaluate when and else branches
        let code = '';
        code += `let ${tVal}, ${fVal};\n`;
        code += `${this.tBlock.toAssignment(tVal)}`;
        const tValRef = new VariableReference(tVal, this.tBlock.dimensions, this.tBlock.degree);
        code += `${this.fBlock.toAssignment(fVal)}`;
        const fValRef = new VariableReference(fVal, this.fBlock.dimensions, this.tBlock.degree);

        // build expressions for when and else modifiers
        let tMod: Expression;
        if (this.condition instanceof RegisterReference) {
            tMod = this.condition;
        }
        else {
            code += `${this.condition.toAssignment('let tCon')}`;
            tMod = new VariableReference('tCon', this.condition.dimensions, this.condition.degree);
        }
        const fMod = BinaryOperation.sub(ONE, tMod);

        // compute the result
        const e1 = BinaryOperation.mul(tValRef, tMod);
        const e2 = BinaryOperation.mul(fValRef, fMod);
        const e3 = BinaryOperation.add(e1, e2);
        code += `${e3.toAssignment(target)}`;

        return `{\n${code}}\n`;
    }

    toCode(): string {
        throw new Error('when..else expression cannot be converted to pure code');
    }
}