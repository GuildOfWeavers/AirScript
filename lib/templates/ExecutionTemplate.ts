// IMPORTS
// ================================================================================================
import { InputRegister, MaskRegister, SegmentRegister, SymbolInfo, InputInfo } from "@guildofweavers/air-script";
import { LoopTemplate } from "./LoopTemplate";
import { validate, isPowerOf2 } from "../utils";

// CLASS DEFINITION
// ================================================================================================
export class ExecutionTemplate {

    readonly inputRegisters     : InputRegister[];
    readonly maskRegisters      : MaskRegister[];
    readonly segmentRegisters   : SegmentRegister[];

    readonly cycleLength        : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(root: LoopTemplate, symbols: Map<string, SymbolInfo>) {

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
            validate(isPowerOf2(steps), errors.cycleLengthNotPowerOf2(steps));
            // TODO: make sure there are no gaps
            if (steps > this.cycleLength) {
                this.cycleLength = steps;
            }
        }
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get loopRegisterOffset(): number {
        return this.inputRegisters.length;
    }

    get segmentRegisterOffset(): number {
        return this.inputRegisters.length
            + this.maskRegisters.length
            + this.segmentRegisters.length;
    }

    get auxRegisterOffset(): number {
        return this.inputRegisters.length
            + this.maskRegisters.length
            + this.segmentRegisters.length;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function rankInputs(symbols: Map<string, SymbolInfo>): InputInfo[][] {
    const rankMap: InputInfo[][] = [];
    for (let symbol of symbols.values()) {
        if (symbol.type === 'input') {
            let inputInfo = symbol as InputInfo;
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
    cycleLengthNotPowerOf2  : (s: any) => `total number of steps is ${s} but must be a power of 2`
};