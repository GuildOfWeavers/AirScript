import { parseScript } from '../index';

const script = `
define MiMC over prime field (2^128 - 9 * 2^32 + 1) {

    // transition function definition
    transition 1 registers {
        for each ($i0) {
            init { $i0 }
    
            for steps [1..63] {
                $r0^3 + $k0
            }
        }
    }

    // transition constraint definition
    enforce 1 constraint {
        for each ($i0) {
            init { $i0 = $n0 }

            for steps [1..63] {
                $r0^3 + $k0 = $n0
            }
        }
    }

    // readonly registers accessible in transition function and constraints
    using 1 readonly register {
        $k0: repeat [ 42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931, 10000042, 19487209, 35831850, 62748495, 105413546, 170859333 ];
    }
}`;

const extensionFactor = 32;
const air = parseScript(script, { extensionFactor });
const pContext = air.initProof([[3n], [4n]], [], []);
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