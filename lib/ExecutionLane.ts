// INTERFACES
// ================================================================================================
type Interval = [number, number];

interface Segment {
    readonly traceMask  : number[];
    readonly body       : any;
}

interface Input {
    readonly registers  : number[];
    readonly initializer: any;
}

// CLASS DEFINITION
// ================================================================================================
export class ExecutionLane {

    readonly inputs     : Input[];
    readonly segments   : Segment[];

    constructor() {
        this.inputs = [];
        this.segments = [];
    }

    get cycleLength(): number {
        // TODO: return based on masks
        return 64;
    }

    addInputs(registers: any[], initializer: any) {
        this.inputs.push({ registers, initializer });
    }

    addSegment(intervals: Interval[], body: any) {
        this.segments.push({ traceMask: parseIntervals(intervals), body });
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