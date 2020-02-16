import { compile } from '../index';

const script = Buffer.from(`
import { Poseidon as Hash } from './assembly/poseidon.aa';

define MerkleBranch over prime field (2^128 - 9 * 2^32 + 1) {

    secret input a  : element[1][0];
    secret input b  : element[1][1];
    public input c  : boolean[1][2];
    secret input d  : element[1][1];
    public input e  : boolean[1][2];

    transition 6 registers {
        for each (a, b, c, d, e) {

            with $r[0..2] {
                init { yield [0, 0, 0]; }
                for each (b, c) {
                    init { yield [1, 1, 1]; }
                    
                    for each (c) {
                        init { yield [2, 2, 2]; }
                        for steps [1..63] {
                            yield [3, 3, 3];
                        }
                    }
                }
            }

            with $r[3..5] yield Hash(d, e);
        }

    }

    enforce 6 constraints {
        for all steps {
            enforce transition($r) = $n;
        }
    }
}`);

const air = compile(script);
console.log(air.toString());