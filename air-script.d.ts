declare module '@guildofweavers/air-script' {

    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------
    import { AirSchema } from '@guildofweavers/air-assembly';
    export { AirSchema } from '@guildofweavers/air-assembly';

    // PUBLIC INTERFACES
    // --------------------------------------------------------------------------------------------
    export class AirScriptError {
        readonly errors: any[];
        constructor(errors: any[]);
    }

    /**
     * Parses and compiles AirScript file into an AirSchema object.
     * @param path Path to the file containing AirScript source.
     * @param componentName Optional component name to be assigned to the parsed module.
     */
    export function compile(path: string, componentName?: string): AirSchema;

    /**
     * Parses and compiles AirScript source code into an AirSchema object.
     * @param source Buffer containing AirScript source code.
     * @param componentName Optional component name to be assigned to the parsed module.
     */
    export function compile(source: Buffer, componentName?: string): AirSchema;

    // INTERNAL INTERFACES
    // --------------------------------------------------------------------------------------------
    export type Interval = [number, number];
    export interface TraceDomain {
        readonly start  : number;
        readonly end    : number;
    }
}