// IMPORTS
// ================================================================================================
import { Expression, JsCodeOptions } from './Expression';
import { BinaryOperation } from './operations/BinaryOperation';
import { SymbolReference } from './SymbolReference';
import { sumDegree, maxDegree } from './utils';

// MODULE VARIABLES
// ================================================================================================
const ONE = new SymbolReference('f.one', [0, 0], 0n);

// CLASS DEFINITION
// ================================================================================================
export class WhenExpression extends Expression {

    readonly id         : number;
    readonly condition  : Expression;
    readonly tBranch    : Expression;
    readonly fBranch    : Expression;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(id: number, condition: Expression, tBranch: Expression, fBranch: Expression) {
        if (!tBranch.isSameDimensions(fBranch)) {
            throw new Error(`when...else statement branches must evaluate to values of same dimensions`);
        }

        const tDegree = sumDegree(tBranch.degree, condition.degree);
        const fDegree = sumDegree(fBranch.degree, condition.degree);
        const degree = maxDegree(tDegree, fDegree);

        super(tBranch.dimensions, degree);
        this.id = id;
        this.condition = condition;
        this.tBranch = tBranch;
        this.fBranch = fBranch;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string, options: JsCodeOptions = {}): string {
        if (!assignTo) throw new Error('when..else expression cannot be converted to pure code');

        const tVal = `tVal${this.id}`, fVal = `fVal${this.id}`, tCon = `tCon${this.id}`;

        // evaluate when and else branches
        let code = `let ${tVal}, ${fVal};\n`;
        code += `${this.tBranch.toJsCode(tVal)}`;
        const tValRef = new SymbolReference(tVal, this.tBranch.dimensions, this.tBranch.degree);
        code += `${this.fBranch.toJsCode(fVal)}`;
        const fValRef = new SymbolReference(fVal, this.fBranch.dimensions, this.tBranch.degree);

        // build expressions for when and else modifiers
        let tMod: Expression;
        if (this.condition instanceof SymbolReference) {
            tMod = this.condition;
        }
        else {
            code += this.condition.toJsCode(`let ${tCon}`);
            tMod = new SymbolReference(tCon, this.condition.dimensions, this.condition.degree);
        }
        const fMod = BinaryOperation.sub(ONE, tMod);

        // compute the result
        const e1 = BinaryOperation.mul(tValRef, tMod);
        const e2 = BinaryOperation.mul(fValRef, fMod);
        const e3 = BinaryOperation.add(e1, e2);
        code += `${e3.toJsCode(assignTo, options)}`;

        return `{\n${code}}\n`;
    }
}