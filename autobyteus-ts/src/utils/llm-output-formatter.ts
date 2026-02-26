type ModelDumpLike = { model_dump: () => Record<string, unknown> };
type DictLike = { dict: () => Record<string, unknown> };
type ToJsonLike = { toJSON: () => unknown };

const hasModelDump = (value: unknown): value is ModelDumpLike =>
  Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as { model_dump?: unknown }).model_dump === 'function'
  );

const hasDict = (value: unknown): value is DictLike =>
  Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as { dict?: unknown }).dict === 'function'
  );

const hasToJSON = (value: unknown): value is ToJsonLike =>
  Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as { toJSON?: unknown }).toJSON === 'function'
  );

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const lstrip = (value: string): string => value.replace(/^\s+/, '');

const isComplexValue = (value: unknown): boolean => {
  if (value && typeof value === 'string' && value.includes('\n')) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (isPlainObject(value)) {
    return Object.keys(value).length > 0;
  }
  if (value instanceof Set || value instanceof Map) {
    return value.size > 0;
  }
  if (hasModelDump(value) || hasDict(value)) {
    return true;
  }
  if (hasToJSON(value)) {
    return true;
  }
  return false;
};

export function formatToCleanString(data: unknown, indent = 0): string {
  const indentStr = ' '.repeat(indent);

  if (data instanceof Set) {
    return formatToCleanString(Array.from(data), indent);
  }

  if (data instanceof Map) {
    return formatToCleanString(Object.fromEntries(data), indent);
  }

  if (hasModelDump(data)) {
    data = data.model_dump();
  } else if (hasDict(data)) {
    data = data.dict();
  } else if (hasToJSON(data)) {
    data = data.toJSON();
  }

  if (isPlainObject(data)) {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return `${indentStr}(empty dict)`;
    }

    const lines = entries.map(([key, value]) => {
      const valueStr = formatToCleanString(value, indent + 2);
      if (isComplexValue(value)) {
        return `${indentStr}${key}:\n${valueStr}`;
      }
      return `${indentStr}${key}: ${lstrip(valueStr)}`;
    });
    return lines.join('\n');
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return `${indentStr}(empty list)`;
    }

    const lines = data.map((item) => {
      const itemStr = formatToCleanString(item, indent + 2);
      if (isComplexValue(item)) {
        return `${indentStr}- \n${itemStr}`;
      }
      return `${indentStr}- ${lstrip(itemStr)}`;
    });
    return lines.join('\n');
  }

  if (typeof data === 'string') {
    if (data.length === 0) {
      return `${indentStr}""`;
    }
    const lines = data.split(/\r?\n/);
    return lines.map((line) => `${indentStr}${line}`).join('\n');
  }

  return `${indentStr}${String(data)}`;
}
