type JsonReplacer = (this: unknown, key: string, value: unknown) => unknown;

const defaultReplacer: JsonReplacer = (_key, value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

export function toJsonString(
  value: unknown,
  indent: number = 2,
  replacer: JsonReplacer = defaultReplacer,
): string {
  return JSON.stringify(value, replacer, indent);
}
