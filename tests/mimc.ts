import { instantiate } from '../index';

const script = Buffer.from(`
define MiMC over prime field (2^128 - 9 * 2^32 + 1) {

    // constants used in transition function and constraint computations
    alpha: 3;

    // transition function definition
    transition 1 register {
        for each ($i0) {
            init $i0;

            for steps [1..65535] {
                $r0^3 + $k0;
            }
        }
    }

    // transition constraint definition
    enforce 1 constraint {
        for all steps {
            transition($r) = $n;
        }
    }

    // readonly registers accessible in transition function and constraints
    using 1 readonly register {
        $k0: repeat [
            42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931,
            10000042, 19487209, 35831850, 62748495, 105413546, 170859333
        ];
    }
}`);

const extensionFactor = 16;

(async function run() {
    const air = await instantiate(script, { extensionFactor, wasmOptions: true });
    console.log(`degree: ${air.maxConstraintDegree}`);

    const gStart = Date.now();

    let start = Date.now();
    const pObject = air.initProof([3n]);
    console.log(`Initialized proof object in ${Date.now() - start} ms`);

    start = Date.now();
    const trace = pObject.generateExecutionTrace();
    console.log(`Execution trace generated in ${Date.now() - start} ms`);

    start = Date.now();
    const pPolys = air.field.interpolateRoots(pObject.executionDomain, trace);
    console.log(`Trace polynomials computed in ${Date.now() - start} ms`);

    start = Date.now();
    const pEvaluations = air.field.evalPolysAtRoots(pPolys, pObject.evaluationDomain);
    console.log(`Extended execution trace in ${Date.now() - start} ms`);

    start = Date.now();
    const cEvaluations = pObject.evaluateTracePolynomials(pPolys);
    console.log(`Constraints evaluated in ${Date.now() - start} ms`);

    start = Date.now();
    const qPolys = air.field.interpolateRoots(pObject.compositionDomain, cEvaluations);
    const qEvaluations = air.field.evalPolysAtRoots(qPolys, pObject.evaluationDomain);
    console.log(`Extended constraints in ${Date.now() - start} ms`);
    console.log(`Total time: ${Date.now() - gStart} ms`);

    const hEvaluations = pObject.secretRegisterTraces[0];

    start = Date.now();
    const vObject = air.initVerification(pObject.traceShape, []);
    console.log(`Initialized verification object in ${Date.now() - start} ms`);

    const x = air.field.exp(vObject.rootOfUnity, 2n);
    const rValues = [pEvaluations.getValue(0, 2)];
    const nValues = [pEvaluations.getValue(0, 18)];
    const hValues = [hEvaluations.getValue(2)];
    const qValues = vObject.evaluateConstraintsAt(x, rValues, nValues, hValues);

    console.log(qEvaluations.getValue(0, 2) === qValues[0]);

})().then(() => console.log('done!'));