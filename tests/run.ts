import { parseScript } from '../index';

const script = `
define MiMC over prime field (2^128 - 9 * 2^32 + 1) {

    // constants used in transition function and constraint computations
    alpha: 3;

    // transition function definition
    transition 1 register in 2^10 steps {
        out: $r0^3 + $k0;
    }

    // transition constraint definition
    enforce 1 constraint {
        out: $n0 - ($r0^3 + $k0);
    }

    // readonly registers accessible in transition function and constraints
    using 1 readonly register {
        $k0: repeat [
            42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931,
            10000042, 19487209, 35831850, 62748495, 105413546, 170859333
        ];
    }
}`;

const extensionFactor = 16;
const air = parseScript(script);
const pContext = air.createContext([], [], extensionFactor);
const trace = pContext.generateExecutionTrace([3n]);
const cEvaluations = pContext.evaluateExecutionTrace(trace);

/*
const air2 = parseScript(script, undefined, { extensionFactor: 8, wasmOptions: false });
const pContext2 = air2.createContext([], []);
const trace2 = air2.generateExecutionTrace([3n], pContext2);
const pPolys2 = air2.field.interpolateRoots(pContext2.executionDomain, trace2);
const pEvaluations2 = air2.field.evalPolysAtRoots(pPolys2, pContext2.evaluationDomain);
const qEvaluations2 = air2.evaluateExtendedTrace(pEvaluations2, pContext2);

const t1 = air2.field.interpolateRoots(pContext2.evaluationDomain, qEvaluations2);
const t2 = air1.field.evalPolysAtRoots(t1, pContext1.evaluationDomain);
*/

console.log('done!');