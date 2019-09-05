import { parseScript } from '../index';

const script = `
define Conditional over prime field (2^64 - 21 * 2^30 + 1) {

    transition 1 register in 4*32 steps {
        when ($k0) {
            when ($k1) {
                out: $r0 + 1;
            }
            else {
                out: $r0 + 2;
            }
        }
        else {
            out: $r0 + 3;
        }
    }

    enforce 1 constraint {
        when ($k0) {
            when ($k1) {
                out: $n0 - ($r0 + 1);
            }
            else {
                out: $n0 - ($r0 + 2);
            }
        }
        else {
            out: $n0 - ($r0 + 3);
        }
    }

    using 2 readonly registers {
        $k0: repeat binary [
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0
        ];

        $k1: repeat binary [
            0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
        ];
    }
}`;

const air = parseScript(script);
console.log(`degree: ${air.maxConstraintDegree}`);