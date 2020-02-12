import { compile } from '../index';

const script = Buffer.from(`
//import { Poseidon as Hash } from './assembly/poseidon.aa';

define MerkleBranch over prime field (2^128 - 9 * 2^32 + 1) {

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
                h <- indexBit ? $r3 : $r0;
                //with $r[0..2] yield Hash(h, node);
                //with $r[3..5] yield Hash(node, h);
                
                init { yield [0, 0, 0, 0, 0, 0]; }
                for steps [0..63] {
                    yield [0, 0, 0, 0, 0, 0];
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