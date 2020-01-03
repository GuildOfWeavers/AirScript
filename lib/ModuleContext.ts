// IMPORTS
// ================================================================================================
import { AirSchema, AirComponent } from "@guildofweavers/air-assembly";
import { ExecutionLane } from "./ExecutionLane";

// CLASS DEFINITION
// ================================================================================================
export class ModuleContext {

    readonly name       : string;
    readonly schema     : AirSchema;
    readonly component  : AirComponent;
    readonly segments   : ExecutionLane[];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name: string, modulus: bigint, registers: number, constraints: number, segments: ExecutionLane[]) {
        this.name = name;
        this.schema = new AirSchema('prime', modulus);
        this.segments = segments;

        const steps = this.segments.reduce((p, c) => c.cycleLength > p ? c.cycleLength : p, 0);
        this.component = this.schema.createComponent(this.name, registers, constraints, steps);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addConstant(name: string, value: bigint | bigint[] | bigint[][]): void {
        //TODO: validateVariableName(name, dimensions);
        this.schema.addConstant(value, `$${name}`);
    }

    addInput(name: string, scope: string, binary = false, parent?: string): void {
        // TODO
        this.component.addInputRegister(scope, binary, undefined, 64);
    }

    addStatic(name: string, values: bigint[]): void {
        // TODO: check name
        this.component.addCyclicRegister(values);
    }
}