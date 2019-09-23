// IMPORTS
// ================================================================================================
import { Expression } from './Expression';
import { getDegree, addDegree } from './operations/degree';
import { StatementBlock } from './StatementBlock';

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

        const tDegree = getDegree(tBlock, condition.degree, addDegree);
        const fDegree = getDegree(fBlock, condition.degree, addDegree);
        const degree = tDegree; // TODO: maxDegree(tDegree, fDegree);

        super(tBlock.dimensions, degree);
        this.condition = condition;
        this.tBlock = tBlock;
        this.fBlock = fBlock;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toAssignment(target: string): string {
        const cVar = 'tCondition';


        const tVar = 'tVar', fVar = 'fVar';
        const tCode = `${this.tBlock.toAssignment(tVar)}\n`;
        const fCode = `${this.fBlock.toAssignment(fVar)}\n`;
        return `${tCode}\n${fCode}`;
    }

    toCode(): string {
        throw new Error('when..else expression cannot be converted to pure code');
    }
}