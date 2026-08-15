export type ParsedCommandOptions = {
    positionals: string[];
    flags: Record<string, string | boolean>;
};
export declare const parseCommandOptions: (args: string[]) => ParsedCommandOptions;
export declare const readStringFlag: (options: ParsedCommandOptions, name: string) => string | null;
export declare const readBooleanFlag: (options: ParsedCommandOptions, name: string) => boolean;
export declare const readPortFlag: (options: ParsedCommandOptions, name: string) => number | null;
//# sourceMappingURL=command-options.d.ts.map