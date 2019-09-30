// IMPORTS
// ================================================================================================
import { Expression } from "./Expression";
import { BinaryOperation } from "./operations/BinaryOperation";
import { SymbolReference } from "./SymbolReference";
import { ExtractVectorElement } from "./vectors/ExtractElement";

// CLASS DEFINITION
// ================================================================================================
export class LoopController {

    readonly segmentCount   : number;
    readonly cycleLength    : number;
    readonly values         : bigint[][];
    readonly modifiers      : Expression[];
    readonly maskToKey      : Map<string, string>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(masks: string[]) {
        this.segmentCount = Math.ceil(Math.log2(masks.length)) * 2;
        this.cycleLength = masks[0].length;
        this.maskToKey = new Map();
        this.modifiers = [];
        this.values = [];

        for (let i = 0; i < this.segmentCount; i++) {
            this.values.push(new Array<bigint>(this.cycleLength));
            this.modifiers.push(buildControlExpression(i, this.segmentCount));
        }

        let p = 0;
        for (let mask of masks) {
            let key = p.toString(2).padStart(this.segmentCount / 2, '0');
            for (let i = 0; i < mask.length; i++) {
                for (let j = 0; j < this.segmentCount / 2; j++) {
                    if (mask[i] === '1') {
                        let value = BigInt(key.charAt(j));
                        this.values[2 * j][i] = value;
                        this.values[2 * j + 1][i] = 1n - value;
                    }
                }
            }
            this.maskToKey.set(mask, key);
            p++;
        }
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    getModifier(mask: string): Expression | undefined {
        let modifier: Expression | undefined;

        const key = this.maskToKey.get(mask);
        if (key) {
            for (let i = 0; i < key.length; i++) {
                let m = (key[i] === '1') ? this.modifiers[2 * i] : this.modifiers[2 * i + 1];
                modifier = modifier ? BinaryOperation.mul(modifier, m) : m;
            }
        }

        return modifier;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function buildControlExpression(index: number, length: number): Expression {
    let result: Expression = new SymbolReference('c', [length, 0], new Array(length).fill(1n));
    result = new ExtractVectorElement(result, index);
    return result;
}