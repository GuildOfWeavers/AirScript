import { compile } from '../index';

const script = Buffer.from(`
import { PoseidonHash as Hash } from './lib128.aa';

define MerkleBranch over prime field (2^128 - 9 * 2^32 + 1) {

    const alpha: 5;
    const MDS: [
        [214709430312099715322788202694750992687,  54066244720673262921467176400601950806, 122144641489288436529811410313120680228],
        [ 83122512782280758906222839313578703456, 163244785834732434882219275190570945140,  65865044136286518938950810559808473518],
        [ 12333142678723890553278650076570367543, 308304933036173868454178201249080175007,  76915505462549994902479959396659996669]
    ];

    secret input leaf       : element[1];      // leaf of the merkle branch
    secret input node       : element[1][1];   // nodes in the merkle branch
    public input indexBit   : boolean[1][1];   // binary representation of leaf position

    transition 6 registers {
        for each (leaf, node, indexBit) {
            init {
                s1 <- [leaf, node, 0];
                s2 <- [node, leaf, 0];
                yield [...s1, ...s2];
            }

            for each (node, indexBit) {
                
                h <- indexBit ? $r3 : $r0;

                init {
                    s1 <- [h, node, 0];
                    s2 <- [node, h, 0];
                    yield [...s1, ...s2];
                }

                for steps [1..4, 60..63] {
                    // full round
                    s1 <- MDS # ($r[0..2] + roundConstants)^alpha;
                    s2 <- MDS # ($r[3..5] + roundConstants)^alpha;
                    yield  [...s1, ...s2];
                }

                for steps [5..59] {
                    // partial round
                    s1 <- MDS # [...$r[0..1], ($r2 + roundConstants[2])^alpha];	
                    s2 <- MDS # [...$r[3..4], ($r5 + roundConstants[2])^alpha];
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

    static roundConstants: [
        cycle prng(sha256, 0x01, 64),
        cycle prng(sha256, 0x02, 64),
        cycle prng(sha256, 0x03, 64)
    ];
}`);

const air = compile(script);
console.log(air.toString());