import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { ModelCatalogService } from "./model-catalog-service.js";
import type { RunModelConfigFieldError } from "../../run-history/domain/run-model-config.js";

export type ModelConfigValidationResult =
  | Readonly<{ kind: "valid"; config: Readonly<Record<string, unknown>> | null }>
  | Readonly<{ kind: "model_unavailable" }>
  | Readonly<{ kind: "schema_unavailable" }>
  | Readonly<{ kind: "invalid"; errors: readonly RunModelConfigFieldError[] }>;

export type RunModelConfigValidator = Pick<ModelConfigValidationService, "validate">;

type JsonSchema = Readonly<Record<string, unknown>>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const normalizeParameter = (row: Record<string, unknown>): [string, JsonSchema] | null => {
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!name) return null;
  const rawType = row.type;
  const type = rawType === "float" ? "number" : rawType === "enum" ? "string" : rawType;
  const schema: Record<string, unknown> = { type };
  const enumValues = row.enum_values ?? row.enumValues;
  if (Array.isArray(enumValues)) schema.enum = enumValues;
  const minimum = row.minimum ?? row.min_value ?? row.minValue;
  const maximum = row.maximum ?? row.max_value ?? row.maxValue;
  if (typeof minimum === "number") schema.minimum = minimum;
  if (typeof maximum === "number") schema.maximum = maximum;
  if (typeof row.pattern === "string") schema.pattern = row.pattern;
  if (row.items !== undefined) schema.items = row.items;
  return [name, schema];
};

const normalizeSchema = (value: unknown): { properties: Record<string, JsonSchema>; required: Set<string> } | null => {
  if (!isPlainObject(value)) return null;
  if (isPlainObject(value.properties)) {
    const properties = Object.fromEntries(
      Object.entries(value.properties)
        .filter((entry): entry is [string, Record<string, unknown>] => isPlainObject(entry[1])),
    );
    return { properties, required: new Set(asStringArray(value.required)) };
  }
  if (!Array.isArray(value.parameters)) return null;
  const properties: Record<string, JsonSchema> = {};
  const required = new Set<string>();
  for (const candidate of value.parameters) {
    if (!isPlainObject(candidate)) continue;
    const normalized = normalizeParameter(candidate);
    if (!normalized) continue;
    properties[normalized[0]] = normalized[1];
    if (candidate.required === true) required.add(normalized[0]);
  }
  return { properties, required };
};

const validateValue = (
  value: unknown,
  schema: JsonSchema,
  path: string,
  errors: RunModelConfigFieldError[],
): void => {
  const type = schema.type;
  const validType = type === undefined ||
    (type === "string" && typeof value === "string") ||
    (type === "boolean" && typeof value === "boolean") ||
    (type === "number" && typeof value === "number" && Number.isFinite(value)) ||
    (type === "integer" && typeof value === "number" && Number.isInteger(value)) ||
    (type === "object" && isPlainObject(value)) ||
    (type === "array" && Array.isArray(value));
  if (!validType) {
    errors.push({ path, message: `Expected ${String(type)}.` });
    return;
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((entry) => Object.is(entry, value))) {
    errors.push({ path, message: "Value is not one of the supported options." });
  }
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      errors.push({ path, message: `Value must be at least ${schema.minimum}.` });
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      errors.push({ path, message: `Value must be at most ${schema.maximum}.` });
    }
  }
  if (typeof value === "string" && typeof schema.pattern === "string") {
    try {
      if (!new RegExp(schema.pattern).test(value)) errors.push({ path, message: "Value does not match the required pattern." });
    } catch {
      errors.push({ path, message: "The current model schema contains an invalid pattern." });
    }
  }
  if (Array.isArray(value) && isPlainObject(schema.items)) {
    value.forEach((entry, index) => validateValue(entry, schema.items as JsonSchema, `${path}[${index}]`, errors));
  }
  if (isPlainObject(value) && isPlainObject(schema.properties)) {
    const properties = schema.properties as Record<string, unknown>;
    for (const required of asStringArray(schema.required)) {
      if (!Object.hasOwn(value, required)) errors.push({ path: `${path}.${required}`, message: "Required value is missing." });
    }
    for (const [key, child] of Object.entries(value)) {
      const childSchema = properties[key];
      if (!isPlainObject(childSchema)) {
        errors.push({ path: `${path}.${key}`, message: "Setting is not supported by the selected runtime and model." });
      } else {
        validateValue(child, childSchema, `${path}.${key}`, errors);
      }
    }
  }
};

export class ModelConfigValidationService {
  constructor(private readonly catalog: Pick<ModelCatalogService, "listLlmModels">) {
    if (!catalog || typeof catalog.listLlmModels !== "function") {
      throw new Error("Model catalog is required.");
    }
  }

  async validate(input: {
    runtimeKind: RuntimeKind;
    llmModelIdentifier: string;
    llmConfig: unknown;
  }): Promise<ModelConfigValidationResult> {
    if (input.llmConfig !== null && !isPlainObject(input.llmConfig)) {
      return { kind: "invalid", errors: [{ path: "llmConfig", message: "Model configuration must be null or an object." }] };
    }
    let models: ModelInfo[];
    try {
      models = await this.catalog.listLlmModels(input.runtimeKind);
    } catch {
      return { kind: "model_unavailable" };
    }
    const model = models.find((candidate) => candidate.model_identifier === input.llmModelIdentifier);
    if (!model) return { kind: "model_unavailable" };
    if (model.config_schema == null) {
      return input.llmConfig === null
        ? { kind: "valid", config: null }
        : { kind: "invalid", errors: [{ path: "llmConfig", message: "This model has no adjustable settings." }] };
    }
    const normalized = normalizeSchema(model.config_schema);
    if (!normalized) return { kind: "schema_unavailable" };
    const config = input.llmConfig as Record<string, unknown> | null;
    const errors: RunModelConfigFieldError[] = [];
    for (const required of normalized.required) {
      if (!config || !Object.hasOwn(config, required)) {
        errors.push({ path: `llmConfig.${required}`, message: "Required value is missing." });
      }
    }
    for (const [key, value] of Object.entries(config ?? {})) {
      const parameter = normalized.properties[key];
      if (!parameter) {
        errors.push({ path: `llmConfig.${key}`, message: "Setting is not supported by the selected runtime and model." });
        continue;
      }
      validateValue(value, parameter, `llmConfig.${key}`, errors);
    }
    return errors.length
      ? { kind: "invalid", errors }
      : { kind: "valid", config: config ? structuredClone(config) : null };
  }
}
