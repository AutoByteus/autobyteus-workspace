import { z } from "zod";

export const nonEmptyStringSchema = z.string().trim().min(1);
export const nullableNonEmptyStringSchema = nonEmptyStringSchema.nullable();
export const finiteNumberSchema = z.number().finite();
export const nullableFiniteNumberSchema = finiteNumberSchema.nullable();
/**
 * A time the server recorded, as ISO 8601 UTC (`Date.toISOString()`): the one source of a conversation row's time
 * (autobyteus-628 D-3). The app shows it and never stamps a row with its own clock.
 */
export const serverTimeSchema = z.iso.datetime();

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(),
  z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema),
]));

export const agentAddressSchema = nonEmptyStringSchema.refine((value) => {
  if (!value.startsWith("/") || value.startsWith("./")) return false;
  if (value === "/") return true;
  if (value.endsWith("/") || value.includes("//") || value.includes("\\")) return false;
  return value.slice(1).split("/").every((part) => part && part === part.trim() && part !== "." && part !== "..");
}, "address must be one canonical rooted Agent address");
