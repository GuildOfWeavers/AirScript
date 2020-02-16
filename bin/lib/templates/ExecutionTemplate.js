"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class ExecutionTemplate {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(root, symbols) {
        const rankedInputs = rankInputs(symbols); // TODO
        // use root template to build register specs
        const registers = { inputs: [], masks: [], segments: [] };
        root.buildRegisterSpecs(registers, symbols, [0]);
        // validate input registers
        this.inputRegisters = registers.inputs;
        // TODO: validate input registers against symbols?
        this.maskRegisters = registers.masks;
        // process and validate segment registers
        this.cycleLength = 0;
        this.segmentRegisters = registers.segments;
        for (let segment of this.segmentRegisters) {
            let steps = segment.mask.length;
            utils_1.validate(utils_1.isPowerOf2(steps), errors.cycleLengthNotPowerOf2(steps));
            // TODO: make sure there are no gaps
            if (steps > this.cycleLength) {
                this.cycleLength = steps;
            }
        }
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get loopRegisterOffset() {
        return this.inputRegisters.length;
    }
    get segmentRegisterOffset() {
        return this.inputRegisters.length
            + this.maskRegisters.length
            + this.segmentRegisters.length;
    }
    get auxRegisterOffset() {
        return this.inputRegisters.length
            + this.maskRegisters.length
            + this.segmentRegisters.length;
    }
}
exports.ExecutionTemplate = ExecutionTemplate;
// HELPER FUNCTIONS
// ================================================================================================
function rankInputs(symbols) {
    const rankMap = [];
    for (let symbol of symbols.values()) {
        if (symbol.type === 'input') {
            let inputInfo = symbol;
            if (rankMap[inputInfo.rank] === undefined) {
                rankMap[inputInfo.rank] = [];
            }
            rankMap[inputInfo.rank].push(inputInfo);
        }
    }
    return rankMap;
}
// ERRORS
// ================================================================================================
const errors = {
    cycleLengthNotPowerOf2: (s) => `total number of steps is ${s} but must be a power of 2`
};
//# sourceMappingURL=ExecutionTemplate.js.map