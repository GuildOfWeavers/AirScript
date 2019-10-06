import { parseScript } from '../index';

const script = `
define MiMC over prime field (2^128 - 9 * 2^32 + 1) {

    MDS: [[-(1 + 2), 2, -3, (4 - 1)], [/2, 1/2, (3 + /2), 8], [9, 10, 11, 12], [13, 14, 15, 16]];

    // transition function definition
    transition 8 registers {

        for each ($i0, $i1) {
            init {
                [$i0, $i1, 0, 0, $i1, $i0, 0, 0];
            }
    
            for each ($i1) {
                init {
                    h <- $p0 ? $r4 : $r0;
                    [h, $i1, 0, 0, $i1, h, 0, 0];
                }
    
                for steps [1..4, 60..63] {
                    // full round
                    S1 <- MDS # ($r[0..3] + $k[0..3])^5;
                    S2 <- MDS # ($r[4..7] + $k[4..7])^5;
                    [...S1, ...S2];
                }
    
                for steps [5..59] {
                    // partial round
                    S1 <- MDS # [...$r[0..2], ($r3 + $k3)^5];	
                    S2 <- MDS # [...$r[4..6], ($r7 + $k7)^5];
                    [...S1, ...S2];
                }
            }
        }
    }

    // transition constraint definition
    enforce 8 constraint {
        for all steps {
            transition($r) = $n;
        }
    }

    // readonly registers accessible in transition function and constraints
    using 9 readonly register {
        $k0: repeat [ 42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931, 10000042, 19487209, 35831850, 62748495, 105413546, 170859333 ];
        $k1: repeat [ 42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931, 10000042, 19487209, 35831850, 62748495, 105413546, 170859333 ];
        $k2: repeat [ 42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931, 10000042, 19487209, 35831850, 62748495, 105413546, 170859333 ];
        $k3: repeat [ 42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931, 10000042, 19487209, 35831850, 62748495, 105413546, 170859333 ];
        $k4: repeat [ 42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931, 10000042, 19487209, 35831850, 62748495, 105413546, 170859333 ];
        $k5: repeat [ 42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931, 10000042, 19487209, 35831850, 62748495, 105413546, 170859333 ];
        $k6: repeat [ 42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931, 10000042, 19487209, 35831850, 62748495, 105413546, 170859333 ];
        $k7: repeat [ 42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931, 10000042, 19487209, 35831850, 62748495, 105413546, 170859333 ];

        $p0: repeat binary [...];
    }
}`;

const extensionFactor = 32;
const air = parseScript(script, { extensionFactor });
const pContext = air.initProof([[1n, 0n, 1n, 0n]], [], [[1n, [2n, 3n]]] as any);  // TODO
console.time('generate trace');
const trace = pContext.generateExecutionTrace();
console.timeEnd('generate trace');
const tPolys = air.field.interpolateRoots(pContext.executionDomain, trace);

console.time('evaluate constraints');
const cEvaluations = pContext.evaluateTracePolynomials(tPolys);
console.timeEnd('evaluate constraints');

const pPolys = air.field.interpolateRoots(pContext.compositionDomain, cEvaluations);
const qEvaluations = air.field.evalPolysAtRoots(pPolys, pContext.evaluationDomain);

console.log('done!');