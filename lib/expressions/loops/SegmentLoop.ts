// IMPORTS
// ================================================================================================
import { Expression, JsCodeOptions } from '../Expression';
import { StatementBlock } from '../StatementBlock';
import { SymbolReference } from '../SymbolReference';
import { BinaryOperation } from '../operations/BinaryOperation';
import { sumDegree } from '../utils';
import { LoopController } from './LoopController';

// INTERFACES
// ================================================================================================
type Interval = [number, number];

// CLASS DEFINITION
// ================================================================================================
export class SegmentLoop extends Expression {

    readonly modifierId : number;
    readonly statements : StatementBlock;
    readonly mask       : number[];

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(statements: StatementBlock, intervals: Interval[], modifierId: number, controlDegree: bigint) {
        const degree = sumDegree(statements.degree, controlDegree);
        super(statements.dimensions, degree);
        this.modifierId = modifierId;
        this.statements = statements;
        this.mask = parseIntervals(intervals);
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string, options?: JsCodeOptions, controller?: LoopController): string {
        if (!assignTo) throw new Error('segment loop cannot be reduced to unassigned code');
        if (!controller) throw new Error('segment loop cannot be reduced to code without a loop controller');

        let code = this.statements.toJsCode(assignTo);

        // apply control modifier
        const resRef = new SymbolReference(assignTo, this.statements.dimensions, this.statements.degree);
        const modifier = controller.getModifier(this.modifierId)!;
        code += BinaryOperation.mul(resRef, modifier).toJsCode(assignTo, options);

        return code;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function parseIntervals(intervals: Interval[]): number[] {

    let maxSteps = 0;
    const stepMap = new Map<number, Interval>();

    for (let interval of intervals) {
        let start = interval[0], end = interval[1];
        if (start > end) {
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