/**
 * The result rule for platform agent tools: a tool result carries only fields with a value,
 * as compact JSON.
 *
 * - `null`, `undefined`, `""`, `[]` and `{}` (after the rule is applied inside it) are left out of
 *   every object, at any depth. An absent field means "none".
 * - `false`, `0` and every other value stay.
 * - Array elements keep their positions: the rule applies inside each element, but no element is
 *   removed.
 * - The top-level value is never removed.
 *
 * Values go through a JSON round trip first, so `toJSON` applies (a `Date` becomes its ISO string,
 * a class instance its JSON form). Every platform tool adapter turns its result into text with
 * `toToolResultJson`; a tool that returns an object for its runtime to render uses
 * `omitEmptyToolResultFields`. Third-party tool results never pass through here.
 */

export type ToolResultJsonValue =
  | null
  | boolean
  | number
  | string
  | ToolResultJsonValue[]
  | { [key: string]: ToolResultJsonValue };

export type ToolResultJsonObject = { [key: string]: ToolResultJsonValue };

export function omitEmptyToolResultFields(value: unknown): ToolResultJsonValue {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    return null;
  }
  return pruneEmptyFields(JSON.parse(serialized) as ToolResultJsonValue);
}

export function toToolResultJson(value: unknown): string {
  return JSON.stringify(omitEmptyToolResultFields(value));
}

const pruneEmptyFields = (value: ToolResultJsonValue): ToolResultJsonValue => {
  if (Array.isArray(value)) {
    return value.map(pruneEmptyFields);
  }
  if (isJsonObject(value)) {
    const pruned: ToolResultJsonObject = {};
    for (const [key, child] of Object.entries(value)) {
      const prunedChild = pruneEmptyFields(child);
      if (!isEmptyValue(prunedChild)) {
        pruned[key] = prunedChild;
      }
    }
    return pruned;
  }
  return value;
};

const isEmptyValue = (value: ToolResultJsonValue): boolean =>
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (isJsonObject(value) && Object.keys(value).length === 0);

const isJsonObject = (value: ToolResultJsonValue): value is ToolResultJsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
