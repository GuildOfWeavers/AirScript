import { compile } from '../index';
import { instantiate, Matrix } from '@guildofweavers/air-assembly';

const schema = compile('./scripts/test4.air');
const air = instantiate(schema, { extensionFactor: 16 });
console.log(`degree: ${air.maxConstraintDegree}`);

const g = [19277929113566293071110308034699488026831934219452440156649784352033n, 19926808758034470970197974370888749184205991990603949537637343198772n];
const p = [24313447595084304058594233432514534662288062665585856194673052057742n, 11283561012092599727291782123823281550391964133479792543258386661577n];
const r = [24205906543396144211665254343088405371302546890229844964400088231402n, 14288195710129182954662708611241591530837581261860973703071318732478n];
const s = 4985319172797574202062022188522117996928464993099991051165884930508n;
const h = 22415580945459993343509530426358128444740520478775315096153588998695n;

const gStart = Date.now();
let start = Date.now();
const pContext = air.initProvingContext([
    [g[0]], [g[1]],
    [toBits(s)],
    [p[0]], [p[1]],
    [toBits(h)],
    [r[0]], [r[1]]
]);
console.log(`Initialized proof object in ${Date.now() - start} ms`);

start = Date.now();
const trace = pContext.generateExecutionTrace();
console.log(`Execution trace generated in ${Date.now() - start} ms`);

printExecutionTrace(trace);

// PRINTING
// ================================================================================================
export function printExecutionTrace(trace: Matrix): void {

    const steps = trace.colCount;
    const colWidth = Math.ceil(trace.elementSize * 1.2);

    // print header row
    const columnHeaders = ['step'.padEnd(8, ' ')];
    columnHeaders.push(' | ');
    for (let i = 0; i < trace.rowCount; i++) {
        columnHeaders.push(`r${i}`.padEnd(colWidth, ' '));
    }
    const headerRow = columnHeaders.join('  ');
    console.log(headerRow);
    console.log('-'.repeat(headerRow.length));

    // print rows
    for (let i = 0; i < steps; i++) {
        let dataRow = [`${i}`.padEnd(8, ' ')];
        dataRow.push(' | ');
        for (let j = 0; j < trace.rowCount; j++) {
            dataRow.push(`${trace.getValue(j, i)}`.padEnd(colWidth, ' '));
        }
        console.log(dataRow.join('  '));
    }
    console.log('-'.repeat(headerRow.length));
}

// HELPER FUNCTIONS
// ================================================================================================
function toBits(value: bigint) {
    const bits = value.toString(2).padStart(256, '0').split('');
    return bits.reverse().map(b => BigInt(b));
}