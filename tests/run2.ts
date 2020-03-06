import { compile } from '../index';
import { instantiate, Matrix } from '@guildofweavers/air-assembly';

const schema = compile('./scripts/test2.air');
const air = instantiate(schema, { extensionFactor: 16 });
console.log(`degree: ${air.maxConstraintDegree}`);

const gStart = Date.now();
let start = Date.now();
const pContext = air.initProvingContext([
    [23650915275526921690793663271046108137725363991070439358669161124887n],
    [[
        25267050788180609508411357457542734500035503281590028628899253433231n,
        4971997975450755487059730297518469412546349561967839034677263001027n,
        7713008066936981317728165061469235583574921444173788803067445637105n,
        3215901401002132929471459647523555383939223394718210746973508773283n,
        2159600785406734492445447148800805402972929207490764505006398031073n,
        7915221002541138193632217853467204300879029561111107194725676468633n,
        23904995351845096193979651853472694381436711117857210562158058304805n,
        21412803942302092236155812306843053172380580246863455319269575853357n
    ]],
    [[0n, 0n, 1n, 0n, 1n, 0n, 1n, 0n]]
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