type RawParameterSchema = {
  parameters?: Array<{
    name?: string;
    type?: string;
    description?: string;
    required?: boolean;
    default_value?: unknown;
    enum_values?: unknown[];
    min_value?: number | null;
    max_value?: number | null;
    pattern?: string | null;
  }>;
};

type RawJsonSchema = {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
};

export type UiModelConfigSchema = Record<string, {
  type?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  minimum?: number | null;
  maximum?: number | null;
  pattern?: string | null;
  required?: boolean;
}>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isValidValueForParam = (
  value: unknown,
  param: {
    type?: string;
    enum?: unknown[];
    minimum?: number | null;
    maximum?: number | null;
    pattern?: string | null;
  },
): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  switch (param.type) {
    case 'boolean':
      if (typeof value !== 'boolean') return false;
      break;
    case 'string':
      if (typeof value !== 'string') return false;
      break;
    case 'integer':
      if (!isFiniteNumber(value) || !Number.isInteger(value)) return false;
      break;
    case 'number':
      if (!isFiniteNumber(value)) return false;
      break;
    default:
      break;
  }

  if (Array.isArray(param.enum) && param.enum.length > 0) {
    if (!param.enum.some((candidate) => Object.is(candidate, value))) {
      return false;
    }
  }

  if (isFiniteNumber(value)) {
    if (typeof param.minimum === 'number' && value < param.minimum) {
      return false;
    }
    if (typeof param.maximum === 'number' && value > param.maximum) {
      return false;
    }
  }

  if (typeof value === 'string' && typeof param.pattern === 'string' && param.pattern.length > 0) {
    try {
      const regex = new RegExp(param.pattern);
      if (!regex.test(value)) {
        return false;
      }
    } catch {
      // Ignore invalid regex patterns from backend schema and keep value.
    }
  }

  return true;
};

export const normalizeModelConfigSchema = (schema: unknown): UiModelConfigSchema | null => {
  if (!isObject(schema)) return null;

  if (Array.isArray((schema as RawParameterSchema).parameters)) {
    const normalized: UiModelConfigSchema = {};
    const params = (schema as RawParameterSchema).parameters ?? [];

    for (const param of params) {
      if (!param || typeof param.name !== 'string' || param.name.length === 0) continue;

      normalized[param.name] = {
        type: param.type,
        description: param.description,
        enum: param.enum_values,
        default: param.default_value,
        minimum: param.min_value ?? null,
        maximum: param.max_value ?? null,
        pattern: param.pattern ?? null,
        required: param.required,
      };
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
  }

  if (isObject((schema as RawJsonSchema).properties)) {
    const normalized: UiModelConfigSchema = {};
    const properties = (schema as RawJsonSchema).properties ?? {};
    const requiredSet = new Set(
      Array.isArray((schema as RawJsonSchema).required)
        ? (schema as RawJsonSchema).required?.filter((value): value is string => typeof value === 'string') ?? []
        : [],
    );

    for (const [key, value] of Object.entries(properties)) {
      if (!isObject(value)) continue;

      const type = typeof value.type === 'string' ? value.type : undefined;
      const description = typeof value.description === 'string' ? value.description : undefined;
      const enumValues = Array.isArray(value.enum) ? value.enum : undefined;
      const defaultValue = 'default' in value ? value.default : undefined;
      const minimum =
        typeof value.minimum === 'number' ? value.minimum : value.minimum === null ? null : undefined;
      const maximum =
        typeof value.maximum === 'number' ? value.maximum : value.maximum === null ? null : undefined;
      const pattern = typeof value.pattern === 'string' ? value.pattern : undefined;

      normalized[key] = {
        type,
        description,
        enum: enumValues,
        default: defaultValue,
        minimum,
        maximum,
        pattern,
        required: requiredSet.has(key),
      };
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
  }

  return null;
};

export const sanitizeModelConfigAgainstSchema = (
  schema: UiModelConfigSchema | null | undefined,
  config: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (!schema || !isObject(config)) {
    return config && isObject(config) ? { ...config } : null;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    const param = schema[key];
    if (!param) {
      continue;
    }
    if (!isValidValueForParam(value, param)) {
      continue;
    }
    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
};
