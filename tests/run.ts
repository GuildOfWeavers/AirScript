import { compile } from '../index';

const script = `
define MiMC over prime field (2^128 - 9 * 2^32 + 1) {

    alpha: 3;

    require 1 input {
        public $i0;
    }

    // transition function definition
    transition 1 registers {
        for each ($i0) {
            init { yield $i0; }
    
            for steps [1..63] {
                b <- $k0 ? 1 : 2;
                a <- $r0^alpha;
                yield a + $k0;
            }
        }
    }

    // transition constraint definition
    enforce 1 constraint {
        for all steps {
            enforce $n = transition($r);
        }
    }

    // static registers accessible in transition function and constraints
    using 1 static register {
        $k0: repeat [ 42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931, 10000042, 19487209, 35831850, 62748495, 105413546, 170859333 ];
    }
}`;

const air = compile(script);
console.log(air.toString());