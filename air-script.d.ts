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

    export function compile(path: string, componentName?: string): Promise<AirSchema>;
    export function compile(source: Buffer, componentName?: string): Promise<AirSchema>;
}