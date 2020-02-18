import { compile } from '../index';
import { instantiate, Matrix } from '@guildofweavers/air-assembly';



const schema = compile('./scripts/merkle32.air');
const air = instantiate(schema);
console.log(air.toString());
console.log(`degree: ${air.maxConstraintDegree}`);

const gStart = Date.now();
let start = Date.now();
const pContext = air.initProvingContext([
    [42n],                                  // $leaf
    [[1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n]],     // $node
    [[0n, 1n, 0n, 1n, 0n, 1n, 0n, 1n]]      // $indexBit
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
    const columnHeaders = ['step'.padEnd(colWidth, ' ')];
    columnHeaders.push(' | ');
    for (let i = 0; i < trace.rowCount; i++) {
        columnHeaders.push(`r${i}`.padEnd(colWidth, ' '));
    }
    const headerRow = columnHeaders.join('  ');
    console.log(headerRow);
    console.log('-'.repeat(headerRow.length));

    // print rows
    for (let i = 0; i < steps; i++) {
        let dataRow = [`${i}`.padEnd(colWidth, ' ')];
        dataRow.push(' | ');
        for (let j = 0; j < trace.rowCount; j++) {
            dataRow.push(`${trace.getValue(j, i)}`.padEnd(colWidth, ' '));
        }
        console.log(dataRow.join('  '));
    }
    console.log('-'.repeat(headerRow.length));
}