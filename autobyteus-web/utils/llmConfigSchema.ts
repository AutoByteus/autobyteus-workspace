type RawParameterSchema = {
  parameters?: Array<{
    name?: string;
    type?: string;
    title?: string;
    label?: string;
    display_name?: string;
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

export type UiModelConfigParameterSchema = {
  type?: string;
  title?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  minimum?: number | null;
  maximum?: number | null;
  pattern?: string | null;
  required?: boolean;
};

export type UiModelConfigSchema = Record<string, UiModelConfigParameterSchema>;

export type UiModelConfigValidationIssue = Readonly<{
  key: string;
  code: 'required' | 'type' | 'enum' | 'minimum' | 'maximum' | 'pattern' | 'schema_pattern';
  expected?: string | number;
}>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const normalizeParameterType = (
  type: string | undefined,
  enumValues: unknown[] | undefined,
): string | undefined => type === 'enum'
  && Array.isArray(enumValues)
  && enumValues.length > 0
  && enumValues.every((value) => typeof value === 'string')
    ? 'string'
    : type;

export const isModelConfigValueRepresentable = (
  value: unknown,
  param: UiModelConfigParameterSchema,
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

export const validateUiModelConfig = (
  schema: UiModelConfigSchema | null | undefined,
  config: Record<string, unknown> | null | undefined,
): readonly UiModelConfigValidationIssue[] => {
  if (!schema) return [];
  const value = config ?? {};
  const issues: UiModelConfigValidationIssue[] = [];
  for (const [key, parameter] of Object.entries(schema)) {
    if (!Object.hasOwn(value, key)) {
      if (parameter.required === true) issues.push({ key, code: 'required' });
      continue;
    }
    const candidate = value[key];
    const validType = parameter.type === undefined ||
      (parameter.type === 'string' && typeof candidate === 'string') ||
      (parameter.type === 'boolean' && typeof candidate === 'boolean') ||
      (parameter.type === 'number' && isFiniteNumber(candidate)) ||
      (parameter.type === 'integer' && isFiniteNumber(candidate) && Number.isInteger(candidate));
    if (!validType) {
      issues.push({ key, code: 'type', expected: parameter.type ?? 'supported value' });
      continue;
    }
    if (Array.isArray(parameter.enum) && !parameter.enum.some((entry) => Object.is(entry, candidate))) {
      issues.push({ key, code: 'enum' });
    }
    if (isFiniteNumber(candidate)) {
      if (typeof parameter.minimum === 'number' && candidate < parameter.minimum) {
        issues.push({ key, code: 'minimum', expected: parameter.minimum });
      }
      if (typeof parameter.maximum === 'number' && candidate > parameter.maximum) {
        issues.push({ key, code: 'maximum', expected: parameter.maximum });
      }
    }
    if (typeof candidate === 'string' && typeof parameter.pattern === 'string' && parameter.pattern.length > 0) {
      try {
        if (!new RegExp(parameter.pattern).test(candidate)) issues.push({ key, code: 'pattern' });
      } catch {
        issues.push({ key, code: 'schema_pattern' });
      }
    }
  }
  return issues;
};

export const getValidSchemaDefault = (
  param: UiModelConfigParameterSchema | null | undefined,
): unknown | undefined => {
  if (!param || param.default === undefined) {
    return undefined;
  }
  return isModelConfigValueRepresentable(param.default, param) ? param.default : undefined;
};

export const resolveEffectiveConfigValue = (
  param: UiModelConfigParameterSchema,
  explicitValue: unknown,
): unknown | undefined => {
  if (explicitValue !== undefined && isModelConfigValueRepresentable(explicitValue, param)) {
    return explicitValue;
  }
  return getValidSchemaDefault(param);
};

export const normalizeModelConfigSchema = (schema: unknown): UiModelConfigSchema | null => {
  if (!isObject(schema)) return null;

  if (Array.isArray((schema as RawParameterSchema).parameters)) {
    const normalized: UiModelConfigSchema = {};
    const params = (schema as RawParameterSchema).parameters ?? [];

    for (const param of params) {
      if (!param || typeof param.name !== 'string' || param.name.length === 0) continue;

      normalized[param.name] = {
        type: normalizeParameterType(param.type, param.enum_values),
        title: firstString(param.title, param.label, param.display_name),
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
      const title = firstString(value.title, value.label, value.display_name);
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
        title,
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
    if (!isModelConfigValueRepresentable(value, param)) {
      continue;
    }
    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
};
