import { z } from "zod";
export declare const nonEmptyStringSchema: z.ZodString;
export declare const nullableNonEmptyStringSchema: z.ZodNullable<z.ZodString>;
export declare const finiteNumberSchema: z.ZodNumber;
export declare const nullableFiniteNumberSchema: z.ZodNullable<z.ZodNumber>;
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
export declare const jsonValueSchema: z.ZodType<JsonValue>;
export declare const agentAddressSchema: z.ZodString;
//# sourceMappingURL=schema-helpers.d.ts.map