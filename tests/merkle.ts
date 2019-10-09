import { parseScript } from '../index';

const script = `
define MerkleBranch over prime field (2^64 - 21 * 2^30 + 1) {

    alpha: 3;
    inv_alpha: 6148914683720324437;

    MDS: [
        [18446744051160973310, 18446744051160973301],
        [                   4,                   13]
    ];

    INV_MDS: [
        [ 2049638227906774814,  6148914683720324439],
        [16397105823254198500, 12297829367440648875]
    ];

    transition 4 register {
        for each ($i0, $i1) {
            init { [$i0, $i1, $i1, $i0] }

            for each ($i1) {
                init {
                    h <- $p0 ? $r0 : $r2;
                    [h, $i1, $i1, h];
                }

                for steps [1..31] {
                    S1 <- MDS # $r[0..1]^alpha + $k[0..1];
                    S1 <- MDS # (/S1)^inv_alpha + $k[2..3];

                    S2 <- MDS # $r[2..3]^alpha + $k[0..1];
                    S2 <- MDS # (/S2)^inv_alpha + $k[2..3];

                    [...S1, ...S2];
                }
            }
        }
    }

    enforce 4 constraint {
        for each ($i0, $i1, $i2, $i3) {
            init { [$i0, $i1, $i1, $i0] = $n }

            for each ($i1) {
                init {
                    h <- $p0 ? $r0 : $r2;
                    [h, $i1, $i1, h] = $n;
                }

                for steps [1..31] {
                    S1 <- MDS # $r[0..1]^alpha + $k[0..1];
                    T1 <- (INV_MDS # ($n[0..1] - $k[2..3]))^alpha;

                    S2 <- MDS # $r[2..3]^alpha + $k[0..1];
                    T2 <- (INV_MDS # ($n[2..3] - $k[2..3]))^alpha;

                    [...S1, ...S2] = [...T1, ...T2]
                }
            }
        }
    }

    using 5 readonly registers {
        $p0: spread binary [...];   // node index

        $k0: repeat [
             3507676442884075254, 14199898198859462402,  9943771478517422846,  5299008510059709046,
             4876587438151046518,   935380327644019241, 11969155768995001697,  8905176503159002610,
            10209632462003885590,  4094264109993537899, 13783103540050167525,  7244561326597804778,
            13136579845459532606,  5360204127205901439, 17688104912985715754, 13327045140049128725,
             8381978233857855775, 17173008252555749159, 16851158199224461544,   198447382074086442,
             6525022393008508587, 15123861172768054914, 10416955771456577164, 11131732656469473226,
             2452137769288432333,  4412015122616966251, 11465432874127736482,  5737914329229941931,
            10297324169560390650,  8193234160249188780,  2724535690916515409,  1291976646389720043
        ];
        $k1: repeat [
            17202444183124002971, 17723456717189439036,  3750639259183275092,  7448158522061432535,
             3164914583837294015, 12646084612349376118,  7395381026560285023,   729218816014270996,
             6265319720055610278,  6560811038686569758, 10193097109625174474, 10009700032272605410,
             5938544421064743176, 12280906544861631781,  8456857679341924027, 11348815465318493332,
             6252463877627126306, 13030052548815547650, 10857148724261265034, 12423114749217998360,
             2246658437530714125, 11512829271452903113,  4058847408561007989,  7479642583779880883,
            13859809880585885275,  8887260856005721590, 16705356207851584356,  6630713008605848931,
            15272332635899000284,  8293330822552540371,  3663678680344765735,  6202077743967849795
        ];
        $k2: repeat [
            13832924244624368586,  9528928158945462573, 14179395919100586062,  6969939104331843825,
             7310089016056177663,  2330122620296285666,   366614009711950633, 15868530560167501485,
            13062220818183197584, 13862631616076321733,  7173753005560765122,  7401758400845058914,
             9637063954876722222, 12866686223156530935, 12581363180925564601, 18095168288661498698,
              705027512553866826, 11889965370647053343, 15427913285119170690,  8002547776917692331,
             9851209343392987354, 17007018513892100862, 13156544984969762532, 17174851075492447770,
            13752314705754602748, 13854843066947953115, 18247924359033306459, 16205059579474396736,
             1084973183965784029, 16412335787336649629, 14382883703753853349, 12271654898018238098
        ];
        $k3: repeat [
            16169418098402584869,  5525673020174675568, 12936657854060094775, 11948000946147909875,
            15353833107488796089, 14618049475397165649,  3778101905464969682,  6365740825469087467,
            16234655844237036703,  2799885056387663031,  5302770125087202743,  5660153358913361974,
            16770940414519030354,  7509765183491975519,  4169330364728586675,  5574639924268823631,
             9363939970816876135, 17273737051928351082, 17191485912205891684,  6684944805026392094,
             5584485950418500906,  2615283273796770954,  7797794717456616920, 17426764471212936270,
            17235322656552057567,  9981174656309333188,  4589122101654576321,   894484646987718932,
             8582267286539513308, 13903972190091769637, 17428182081597550586,  9464705238429071998
        ];
    }
}`;

const extensionFactor = 16;
const air = parseScript(script, { extensionFactor });
console.log(`degree: ${air.maxConstraintDegree}`);

const gStart = Date.now();
let start = Date.now();
const pObject = air.initProof([[42n, [1n, 2n, 3n, 4n]]], [[0n, 1n, 0n, 1n]], []);
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

const hRegisterValues = pObject.hiddenRegisterTraces;

start = Date.now();
const qPolys = air.field.interpolateRoots(pObject.compositionDomain, cEvaluations);
const qEvaluations = air.field.evalPolysAtRoots(qPolys, pObject.evaluationDomain);
console.log(`Extended constraints in ${Date.now() - start} ms`);
console.log(`Total time: ${Date.now() - gStart} ms`);

const vContext = air.initVerification(pObject.traceShape, [[0n, 1n, 0n, 1n]]);

const x = air.field.exp(vContext.rootOfUnity, 2n);
const rValues = [pEvaluations.getValue(0, 2), pEvaluations.getValue(1, 2), pEvaluations.getValue(2, 2), pEvaluations.getValue(3, 2)];
const nValues = [pEvaluations.getValue(0, 18), pEvaluations.getValue(1, 18), pEvaluations.getValue(2, 18), pEvaluations.getValue(3, 18)];
const hValues = [hRegisterValues[0].getValue(2), hRegisterValues[1].getValue(2)];
const qValues = vContext.evaluateConstraintsAt(x, rValues, nValues, hValues);

console.log(qEvaluations.getValue(0, 2) === qValues[0]);