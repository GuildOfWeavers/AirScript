import { parseScript } from '../index';

const script = `
define Rescue over prime field (2^256 - 351 * 2^32 + 1) {

    alpha: 3;
    V1: [1, 2];
    MDS: [[1, 2], [3, 4]];
	
	transition 4 registers in 32 steps {
        a: 1 + 2 + $r0;
        out: [a, $r2, 1, $k0];
	}
	
	enforce 1 constraint of degree 3 {
        a: 1 + 2;
        out: a;
    }
    
    using 2 readonly registers {
        $k0: repeat [1, 2, 3, 4];
        $k1: spread [1, 3];
    }
}`;

const result = parseScript(script, {
    maxSteps                : 2**20,
    maxMutableRegisters     : 64,
    maxReadonlyRegisters    : 64,
    maxConstraintCount      : 1024,
    maxConstraintDegree     : 16
});
console.log(result);