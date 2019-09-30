// IMPORTS
// ================================================================================================
import { Expression, ExpressionDegree } from './Expression';
import { areSameDimensions, isScalar } from '../utils';
import { StatementBlock } from './StatementBlock';
import { SymbolReference } from './SymbolReference';
import { BinaryOperation } from './operations/BinaryOperation';
import { sumDegree, maxDegree } from './utils';

// MODULE VARIABLES
// ================================================================================================
const ONE = new SymbolReference('f.one', [0, 0], 0n);

// INTERFACES
// ================================================================================================
export interface TransitionSegment {
    statements  : StatementBlock;
    intervals   : Interval[];
}

type Interval = [number, number];

// CLASS DEFINITION
// ================================================================================================
export class TransitionExpression extends Expression {

    readonly cycleLength    : number;
    readonly controls       : bigint[][];
    readonly blocks         : StatementBlock[];

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(segments: TransitionSegment[]) {

        // determine dimensions and degree of controls
        const dimensions = segments[0].statements.dimensions;
        const controlDegree = BigInt(Math.ceil(Math.log2(segments.length)));
        let degree: ExpressionDegree = isScalar(dimensions)
            ? 0n
            : new Array<bigint>(dimensions[0]).fill(0n);

        // break segments into blocks and interval groups
        const blocks: StatementBlock[] = [];
        const intervalGroups: Interval[][] = [];
        for (let segment of segments) {
            blocks.push(segment.statements);
            intervalGroups.push(segment.intervals);

            // calculate expression degree
            degree = maxDegree(sumDegree(segment.statements.degree, controlDegree), degree);

            // make sure all segments have the same dimensions
            if (!areSameDimensions(dimensions, segment.statements.dimensions)) {
                throw new Error('TODO');
            }
        }

        super(dimensions, degree);
        this.cycleLength = validateIntervals(intervalGroups);
        this.controls = buildControls(intervalGroups, this.cycleLength);
        this.blocks = blocks;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string): string {
        if (assignTo) throw new Error('transition block cannot be assigned to a variable');

        let code = ``;
        const tModifiers: Expression[] = [], fModifiers: Expression[] = [];
        for (let i = 0; i < this.controls.length; i++) {
            let tRef = `c[${i}]`, fRef = `fc${i}`;
            tModifiers.push(new SymbolReference(tRef, [0, 0], 1n));
            fModifiers.push(new SymbolReference(fRef, [0, 0], 1n));
            code += `let ${BinaryOperation.sub(ONE, tModifiers[i]).toJsCode(fRef)}`;
        }

        code += `let ${this.blocks.map((b, i) => `b${i}`).join(', ')};\n`;
        const bResults: Expression[] = [];
        for (let i = 0; i < this.blocks.length; i++) {
            let bVar = `b${i}`, block = this.blocks[i];
            let bRef = new SymbolReference(bVar, block.dimensions, block.degree);
            code += `${this.blocks[i].toJsCode(bVar)}`;
            
            let modifier: Expression | undefined;
            for (let j = 0; j < this.controls.length; j++) {
                let m = (i & (1 << j)) ? tModifiers[j] : fModifiers[j];
                modifier = modifier ? BinaryOperation.mul(modifier, m) : m;
            }
            bResults.push(modifier ? BinaryOperation.mul(bRef, modifier) : bRef);
        }

        let result: Expression | undefined;
        for (let bResult of bResults) {
            result = result ? BinaryOperation.add(result, bResult) : bResult;
        }

        code += this.isScalar
            ? `return [${result!.toJsCode()}];\n`
            : `return ${result!.toJsCode()}.values;\n`;

        return code;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function buildControls(intervalGroups: Interval[][], cycleLength: number): bigint[][] {
    const controlCount = Math.ceil(Math.log2(intervalGroups.length));
    const controls = new Array<bigint[]>(controlCount);
    for (let i = 0; i < controlCount; i++) {
        controls[i] = new Array<bigint>(cycleLength);
    }

    let mask = 0;
    for (let intervals of intervalGroups) {
        for (let [start, end] of intervals) {
            for (let i = start; i <= end; i++) {
                let maskString = mask.toString(2).padStart(controlCount, '0');
                for (let j = 0; j < controlCount; j++) {
                    controls[j][i] = BigInt(maskString.charAt(j));
                }
            }
        }
        mask++;
    }

    return controls;
}

function validateIntervals(intervalGroups: Interval[][]): number {

    let maxValue = 0;
    const valueMap = new Map<number, Interval>();

    for (let intervals of intervalGroups) {
        for (let interval of intervals) {
            let start = interval[0], end = interval[1];
            if (start > end) {
                throw new Error(`range error`); // TODO: better error message
            }

            for (let i = start; i <= end; i++) {
                if (valueMap.has(i)) {
                    throw new Error(`range error`); // TODO: better error message
                }
                valueMap.set(i, interval);
                if (i > maxValue) {
                    maxValue = i;
                }
            }
        }
    }

    if (valueMap.size <= maxValue) {
        throw new Error(`range error`); // TODO: better error message
    }

    return maxValue;
}