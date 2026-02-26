const formatJsonValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatJsonValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${JSON.stringify(key)}: ${formatJsonValue(val)}`);
    return `{${entries.join(', ')}}`;
  }
  return JSON.stringify(String(value));
};

const formatPythonValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'None';
  }
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "\\'")}'`;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatPythonValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${formatPythonValue(key)}: ${formatPythonValue(val)}`);
    return `{${entries.join(', ')}}`;
  }
  return String(value);
};

export const formatToolPayloadValueJson = (value: unknown): string => formatJsonValue(value);
export const formatToolPayloadValuePython = (value: unknown): string => formatPythonValue(value);
