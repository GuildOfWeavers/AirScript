import { parseScript } from '../index';

const script = `
define MiMC over prime field (2^256 - 351 * 2^32 + 1) {

    // global constants used in transition function and constraint computations
    alpha: 3;

    // transition function definition
    transition 1 register in 2^13 steps {
        out <- $r0^alpha + $k0;
    }

    // transition constraint definition
    enforce 1 constraint of degree 3 {
        out <- $n0 - ($r0^alpha + $k0);
    }

    // readonly registers accessible in transition function and constraints
    using 1 readonly register {
        $k0: repeat [
            42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931,
            10000042, 19487209, 35831850, 62748495, 105413546, 170859333
        ];
    }
}`;

const result = parseScript(script);

const r = [3n];
const k = [42n];
const n = new Array<bigint>(1);
result.transitionFunction(r, k, result.globalConstants, n);
console.log(n);

const c = new Array<bigint>(1);
result.constraintEvaluator(r, n, k, result.globalConstants, c);
console.log(c);