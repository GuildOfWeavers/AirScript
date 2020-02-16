import { compile } from '../index';

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

const air = compile(script);
console.log(air.toString());