import { parseScript } from '../index';

const script = `
define MiMC over prime field (2^256 - 351 * 2^32 + 1) {

    // constants used in transition function and constraint computations
    alpha: 3;

    // transition function definition
    transition 1 register in 2^8 steps {
        when ($k1) {
            out: $r0^3 + $k0 + $p0;
        }
        else {
            out: $r0^alpha + $k0;
        }
    }

    // transition constraint definition
    enforce 1 constraint {

        M: [[1, alpha], [$k0, $p0]];
        V: [$k0, $p0];

        M2: M^3;
        V2: M # V;

        n0: $k1 ? $r0^alpha + $k0 + $p0 | $r0^alpha + $k0;
        out: $n0 - n0;
    }

    // readonly registers accessible in transition function and constraints
    using 4 readonly registers {
        $k0: repeat [
            42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931,
            10000042, 19487209, 35831850, 62748495, 105413546, 170859333
        ];

        $k1: repeat binary [1, 0, 1, 0];

        $p0: spread [...];

        $s0: spread binary [...];
    }
}`;

const air = parseScript(script);

const pContext = air.createContext([[1n, 2n, 3n, 4n]], [[0n, 1n, 1n, 0n]]);
const trace = air.generateExecutionTrace([3n], pContext);
const pPoly = air.field.interpolateRoots(pContext.executionDomain, trace[0]);
const pEvaluations = air.field.evalPolyAtRoots(pPoly, pContext.evaluationDomain);

const qEvaluations = air.evaluateExtendedTrace([pEvaluations], pContext);
const vContext = air.createContext([[1n, 2n, 3n, 4n]]);

const x = air.field.exp(vContext.rootOfUnity, 2n);
const rValues = [pEvaluations[2]];
const nValues = [pEvaluations[10]];
const qValues = air.evaluateConstraintsAt(x, rValues, nValues, [], vContext);

console.log(qEvaluations[0][2] === qValues[0]);