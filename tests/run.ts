import { parseScript, parseStatementBlock } from '../index';

const statements = `
    a: (24 + 3) * 4^5;
    
    B1: [1, 2 + $n2];
    B2: [2, 2];
    B3: B1 + B2;

    M1: [[1, 2], [3, 4]];
    out: 43 + a + $r0^2 * $k2;
`;

const result = parseStatementBlock(statements);
console.log(result.code);