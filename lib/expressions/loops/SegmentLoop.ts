// IMPORTS
// ================================================================================================
import { Expression, JsCodeOptions } from '../Expression';
import { StatementBlock } from '../StatementBlock';
import { SymbolReference } from '../SymbolReference';
import { BinaryOperation } from '../operations/BinaryOperation';
import { sumDegree } from '../utils';

// INTERFACES
// ================================================================================================
type Interval = [number, number];

// CLASS DEFINITION
// ================================================================================================
export class SegmentLoop extends Expression {

    readonly controller : Expression;
    readonly statements : StatementBlock;
    readonly traceMask  : number[];

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(statements: StatementBlock, intervals: Interval[], controller: Expression) {
        const degree = sumDegree(statements.degree, controller.degree);
        super(statements.dimensions, degree);
        this.controller = controller;
        this.statements = statements;
        this.traceMask = parseIntervals(intervals);
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string, options?: JsCodeOptions): string {
        if (!assignTo) throw new Error('segment loop cannot be reduced to unassigned code');

        let code = this.statements.toJsCode(assignTo);

        // apply control modifier
        const resRef = new SymbolReference(assignTo, this.statements.dimensions, this.statements.degree);
        code += BinaryOperation.mul(resRef, this.controller).toJsCode(assignTo, options);

        return code;
    }

    toAssembly(): string {
        return `(mul ${this.statements.toAssembly()} ${this.controller.toAssembly()})\n`;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function parseIntervals(intervals: Interval[]): number[] {

    let maxSteps = 0;
    const stepMap = new Map<number, Interval>();

    for (let interval of intervals) {
        let start = interval[0], end = interval[1];
        if (start < 1) {
            throw new Error(`invalid step interval [${start}..${end}]: start index must be greater than 0`);
        }
        else if (start > end) {
            throw new Error(`invalid step interval [${start}..${end}]: start index must be smaller than end index`);
        }

        for (let i = start; i <= end; i++) {
            if (stepMap.has(i)) {
                const [s2, e2] = stepMap.get(i)!;
                throw new Error(`step interval [${start}..${end}] overlaps with interval [${s2}..${e2}]`);
            }
            stepMap.set(i, interval);
            if (i > maxSteps) {
                maxSteps = i;
            }
        }
    }
    
    const mask = new Array<number>(maxSteps + 1).fill(0);
    for (let [start, end] of intervals) {
        for (let i = start; i <= end; i++) {
            mask[i] = 1;
        }
    }

    return mask;
}