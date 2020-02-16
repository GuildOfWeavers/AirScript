import { compile } from '../index';
import { instantiate, Matrix } from '@guildofweavers/air-assembly';

const script = Buffer.from(`
define MerkleBranch over prime field (2^32 - 3 * 2^25 + 1) {

    const alpha: 5;
    const MDS: [
        [2839769753, 1346737110, 1785908782],
        [188086132,  2502886257, 1931847234],
        [3765329763, 2749177114,   93405347]
    ];

    static roundConstants: [
        cycle prng(sha256, 0x01, 64),
        cycle prng(sha256, 0x02, 64),
        cycle prng(sha256, 0x03, 64)
    ];

    secret input leaf       : element[1];      // leaf of the merkle branch
    secret input node       : element[1][1];   // nodes in the merkle branch
    public input indexBit   : boolean[1][1];   // binary representation of leaf position

    transition 6 registers {
        for each (leaf, node, indexBit) {

            // initialize the execution trace to hash(leaf, node) in registers [0..2]
            // and hash(node, leaf) in registers [3..5]
            init {
                s1 <- [leaf, node, 0];
                s2 <- [node, leaf, 0];
                yield [...s1, ...s2];
            }

            for each (node, indexBit) {

                // based on node's index, figure out whether hash(p, v) or hash(v, p)
                // should advance to the next iteration of the loop
                init {
                    h <- indexBit ? $r3 : $r0;
                    s1 <- [h, node, 0];
                    s2 <- [node, h, 0];
                    yield [...s1, ...s2];
                }

                // run Poseidon hash function
                for steps [1..4, 60..63] {
                    // full round
                    s1 <- MDS # ($r[0..2] + roundConstants)^alpha;
                    s2 <- MDS # ($r[3..5] + roundConstants)^alpha;
                    yield  [...s1, ...s2];
                }

                for steps [5..59] {
                    // partial round
                    s1 <- MDS # [...($r[0..1] + roundConstants[0..1]), ($r2 + roundConstants[2])^alpha];
                    s2 <- MDS # [...($r[3..4] + roundConstants[0..1]), ($r5 + roundConstants[2])^alpha];
                    yield [...s1, ...s2];
                }
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