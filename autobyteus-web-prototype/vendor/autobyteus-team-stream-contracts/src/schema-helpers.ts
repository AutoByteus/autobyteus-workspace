import { z } from "zod";

export const nonEmptyStringSchema = z.string().trim().min(1);
export const nullableNonEmptyStringSchema = nonEmptyStringSchema.nullable();
export const finiteNumberSchema = z.number().finite();
export const nullableFiniteNumberSchema = finiteNumberSchema.nullable();

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema),
  z.record(z.string(), jsonValueSchema),
]));

export const readonlyParsed = <T>(value: T): T => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) readonlyParsed(child);
  return Object.freeze(value);
};
