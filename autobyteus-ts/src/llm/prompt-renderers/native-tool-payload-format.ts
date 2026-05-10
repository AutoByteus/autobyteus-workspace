export const cloneJsonObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return { ...value as Record<string, unknown> };
  }
};

export const stringifyJsonArguments = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
};

export const stringifyToolResultForProvider = (
  value: unknown,
  error?: string | null
): string => {
  if (error) {
    return `Error: ${error}`;
  }
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};
