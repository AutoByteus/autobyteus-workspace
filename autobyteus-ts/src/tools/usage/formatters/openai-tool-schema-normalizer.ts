export interface OpenAiToolSchemaOptions {
  /**
   * Strict OpenAI function tools require all fields to be required with nullable
   * optional semantics. That transform is intentionally not enabled in this
   * change, so strict remains gated/off by default.
   */
  strict?: false;
}

type JsonSchemaValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

const OBJECT_SCHEMA_MARKERS = new Set(['properties', 'required', 'additionalProperties']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function includesObjectType(typeValue: unknown): boolean {
  if (typeValue === 'object') {
    return true;
  }
  return Array.isArray(typeValue) && typeValue.includes('object');
}

function isObjectSchema(schema: Record<string, unknown>): boolean {
  if (includesObjectType(schema.type)) {
    return true;
  }

  return Array.from(OBJECT_SCHEMA_MARKERS).some((key) => key in schema);
}

function normalizeValue(value: unknown): JsonSchemaValue {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (!isRecord(value)) {
    return value as JsonSchemaValue;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, childValue] of Object.entries(value)) {
    normalized[key] = normalizeValue(childValue);
  }

  if (isObjectSchema(normalized)) {
    normalized.additionalProperties = false;
  }

  return normalized;
}

export function normalizeOpenAiToolParameters(
  parameters: Record<string, unknown>,
  options: OpenAiToolSchemaOptions = {}
): Record<string, unknown> {
  if (options.strict !== undefined && options.strict !== false) {
    throw new Error(
      'OpenAI strict tool schemas are not enabled because nullable-required optional field semantics are not implemented yet.'
    );
  }

  const normalized = normalizeValue(parameters);
  if (!isRecord(normalized)) {
    throw new Error('OpenAI tool parameters must normalize to a JSON Schema object.');
  }
  return normalized;
}
