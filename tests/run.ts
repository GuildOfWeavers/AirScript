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
const tPolys = air.field.interpolateRoots(pContext.executionDomain, trace);

const cEvaluations = pContext.evaluateTracePolynomials(tPolys);

const pPolys = air.field.interpolateRoots(pContext.compositionDomain, cEvaluations);
const qEvaluations = air.field.evalPolysAtRoots(pPolys, pContext.evaluationDomain);

console.log('done!');