// IMPORTS
// ================================================================================================
import { compile } from '../index';
import { instantiate } from '@guildofweavers/air-assembly';

// SOURCE CODE
// ================================================================================================
const script = Buffer.from(`
define MiMC over prime field (2^128 - 9 * 2^32 + 1) {

    const alpha: 3;
    
    static roundConstant: cycle prng(sha256, 0x01, 64);

    secret input startValue: element[1];

    // transition function definition
    transition 1 register {
        for each (startValue) {
            init { yield startValue; }

            for steps [1..255] {
                yield $r0^alpha + roundConstant;
            }
        }
    }

    // transition constraint definition
    enforce 1 constraint {
        for all steps {
            enforce transition($r) = $n;
        }
    }

}`);

// TESTING
// ================================================================================================
const extensionFactor = 16;

const schema = compile(script);
const air = instantiate(schema, { extensionFactor, wasmOptions: true });
console.log(`degree: ${air.maxConstraintDegree}`);

const gStart = Date.now();

let start = Date.now();
const pContext = air.initProvingContext([[3n]]);
console.log(`Initialized proof object in ${Date.now() - start} ms`);

start = Date.now();
const trace = pContext.generateExecutionTrace();
console.log(`Execution trace generated in ${Date.now() - start} ms`);

start = Date.now();
const pPolys = air.field.interpolateRoots(pContext.executionDomain, trace);
console.log(`Trace polynomials computed in ${Date.now() - start} ms`);

start = Date.now();
const pEvaluations = air.field.evalPolysAtRoots(pPolys, pContext.evaluationDomain);
console.log(`Extended execution trace in ${Date.now() - start} ms`);

start = Date.now();
const cEvaluations = pContext.evaluateTransitionConstraints(pPolys);
console.log(`Constraints evaluated in ${Date.now() - start} ms`);

start = Date.now();
const qPolys = air.field.interpolateRoots(pContext.compositionDomain, cEvaluations);
const qEvaluations = air.field.evalPolysAtRoots(qPolys, pContext.evaluationDomain);
console.log(`Extended constraints in ${Date.now() - start} ms`);
console.log(`Total time: ${Date.now() - gStart} ms`);

const hEvaluations = pContext.secretRegisterTraces[0];

start = Date.now();
const vContext = air.initVerificationContext(pContext.inputShapes);
console.log(`Initialized verification object in ${Date.now() - start} ms`);

const x = air.field.exp(vContext.rootOfUnity, 2n);
const rValues = [pEvaluations.getValue(0, 2)];
const nValues = [pEvaluations.getValue(0, 18)];
const hValues = [hEvaluations.getValue(2)];
const qValues = vContext.evaluateConstraintsAt(x, rValues, nValues, hValues);

console.log(qEvaluations.getValue(0, 2) === qValues[0]);

console.log('done!');