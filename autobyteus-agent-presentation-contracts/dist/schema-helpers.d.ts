import { z } from "zod";
export declare const nonEmptyStringSchema: z.ZodString;
export declare const nullableNonEmptyStringSchema: z.ZodNullable<z.ZodString>;
export declare const finiteNumberSchema: z.ZodNumber;
export declare const nullableFiniteNumberSchema: z.ZodNullable<z.ZodNumber>;
/**
 * A time the server recorded, as ISO 8601 UTC (`Date.toISOString()`): the one source of a conversation row's time
 * (autobyteus-628 D-3). The app shows it and never stamps a row with its own clock.
 */
export declare const serverTimeSchema: z.ZodISODateTime;
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
export declare const jsonValueSchema: z.ZodType<JsonValue>;
export declare const agentAddressSchema: z.ZodString;
//# sourceMappingURL=schema-helpers.d.ts.map