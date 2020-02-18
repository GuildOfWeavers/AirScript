import { compile } from '../index';
import { instantiate, Matrix } from '@guildofweavers/air-assembly';

const script = Buffer.from(`
import { Poseidon as Hash } from './assembly/poseidon32.aa';

define MerkleBranch over prime field (2^32 - 3 * 2^25 + 1) {

    secret input leaf       : element[1];      // leaf of the merkle branch
    secret input node       : element[1][1];   // nodes in the merkle branch
    public input indexBit   : boolean[1][1];   // binary representation of leaf position

    transition 6 registers {
        for each (leaf, node, indexBit) {

            init {
                s1 <- [leaf, node, 0];
                s2 <- [node, leaf, 0];
                yield [...s1, ...s2];
            }

            for each (node, indexBit) {
                h <- indexBit ? $r3 : $r0;
                with $r[0..2] yield Hash(h, node);
                with $r[3..5] yield Hash(node, h);
            }
        }
    }

    enforce 6 constraints {
        for all steps {
            enforce transition($r) = $n;
        }
    }
}`);

const schema = compile(script);
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