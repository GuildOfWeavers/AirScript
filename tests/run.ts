import { parseScript, parseStatementBlock } from '../index';

const script = `
define Rescue over prime field (2^256 - 351 * 2^32 + 1) {

    alpha: 3;
    beta: [1, 2];
    MDS: [[1, 2], [3, 4]];
	
	transition 4 registers in 32 steps {
        a: 1 + 2;
        out: a;
	}
	
	enforce 4 constraints of degree 3 {
        a: 1 + 2;
        out: a;
	}
}`;

const statements = `
    a: (24 + 3) * 4^5;
    
    B1: [1, 2 + $n2];   // comment
    B2: [2, 2];
    B3: B1 + B2;

    M1: [[1, 2], [3, 4]];
    out: 43 + a + $r0^2 * $k2;
`;

const result = parseScript(script, {
    maxMutableRegisters     : 64,
    maxReadonlyRegisters    : 64,
    maxConstraintCount      : 1024,
    maxConstraintDegree     : 16,
    maxSteps                : 2**20
});
console.log(result);