import { instantiate } from '../index';

const extensionFactor = 32;

(async function run() {

    const air = await instantiate('./tests/scripts/test.air', { extensionFactor });
    const pContext = air.initProof([3n]);
    console.time('generate trace');
    const trace = pContext.generateExecutionTrace();
    console.timeEnd('generate trace');
    const tPolys = air.field.interpolateRoots(pContext.executionDomain, trace);

    console.time('evaluate constraints');
    const cEvaluations = pContext.evaluateTracePolynomials(tPolys);
    console.timeEnd('evaluate constraints');

    const pPolys = air.field.interpolateRoots(pContext.compositionDomain, cEvaluations);
    const qEvaluations = air.field.evalPolysAtRoots(pPolys, pContext.evaluationDomain);

    console.log(test(3n, 31, 63) === trace.toValues()[0][63]);

    function test(input: bigint, s1: number, s2: number) {
        const k = [ 42n, 43n, 170n, 2209n, 16426n, 78087n, 279978n, 823517n, 2097194n, 4782931n, 10000042n, 19487209n, 35831850n, 62748495n, 105413546n, 170859333n ];
        let i = 0;
        for (; i < s1; i++) {
            input = air.field.add(air.field.exp(input, 3n), k[i % k.length] );
        }
    
        for (; i < s2; i++) {
            input = air.field.add(air.field.exp(input, 2n), k[i % k.length] );
        }
    
        return input;
    }
})().then(() => console.log('done!'));