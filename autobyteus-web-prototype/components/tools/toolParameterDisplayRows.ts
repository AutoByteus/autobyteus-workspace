import type { ToolParameter } from '~/stores/toolManagementStore';

const MAX_NESTED_SCHEMA_DEPTH = 5;

type JsonSchemaRecord = Record<string, unknown>;

export type ToolParameterDisplayRow = {
  id: string;
  name: string;
  path: string;
  depth: number;
  paramType: string;
  required: boolean;
  description: string;
  defaultValue: string | null;
  enumValues: string[] | null;
};

const isRecord = (value: unknown): value is JsonSchemaRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toOptionalString = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const toStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const strings = value.filter((item): item is string => typeof item === 'string');
  return strings.length > 0 ? strings : null;
};

const getPrimarySchemaType = (schema: JsonSchemaRecord): string | null => {
  const rawType = schema.type;
  if (typeof rawType === 'string') {
    return rawType;
  }

  if (Array.isArray(rawType)) {
    const firstNonNullType = rawType.find((type) => typeof type === 'string' && type !== 'null');
    return typeof firstNonNullType === 'string' ? firstNonNullType : null;
  }

  return null;
};

const toDisplayType = (schema: JsonSchemaRecord): string => {
  const schemaType = getPrimarySchemaType(schema);
  if (schemaType === 'number') {
    return 'FLOAT';
  }
  if (schemaType === 'integer') {
    return 'INTEGER';
  }
  if (schemaType === 'boolean') {
    return 'BOOLEAN';
  }
  if (schemaType === 'object') {
    return 'OBJECT';
  }
  if (schemaType === 'array') {
    return 'ARRAY';
  }
  if (schemaType === 'string') {
    return 'STRING';
  }
  if (Array.isArray(schema.enum)) {
    return 'ENUM';
  }

  return 'UNKNOWN';
};

const getRequiredPropertyNames = (schema: JsonSchemaRecord): Set<string> => {
  if (!Array.isArray(schema.required)) {
    return new Set();
  }

  return new Set(schema.required.filter((name): name is string => typeof name === 'string'));
};

const getObjectProperties = (schema: JsonSchemaRecord): Array<[string, JsonSchemaRecord]> => {
  if (!isRecord(schema.properties)) {
    return [];
  }

  return Object.entries(schema.properties).filter(
    (entry): entry is [string, JsonSchemaRecord] => isRecord(entry[1]),
  );
};

const appendNestedSchemaRows = (
  rows: ToolParameterDisplayRow[],
  schema: JsonSchemaRecord,
  parentPath: string,
  depth: number,
  seenSchemas: WeakSet<JsonSchemaRecord>,
): void => {
  if (depth > MAX_NESTED_SCHEMA_DEPTH || seenSchemas.has(schema)) {
    return;
  }

  seenSchemas.add(schema);

  const requiredPropertyNames = getRequiredPropertyNames(schema);
  for (const [propertyName, propertySchema] of getObjectProperties(schema)) {
    const path = `${parentPath}.${propertyName}`;
    rows.push({
      id: path,
      name: propertyName,
      path,
      depth,
      paramType: toDisplayType(propertySchema),
      required: requiredPropertyNames.has(propertyName),
      description: typeof propertySchema.description === 'string' ? propertySchema.description : '',
      defaultValue: toOptionalString(propertySchema.default),
      enumValues: toStringArray(propertySchema.enum),
    });

    appendNestedSchemaRows(rows, propertySchema, path, depth + 1, seenSchemas);
  }

  seenSchemas.delete(schema);
};

export const buildToolParameterDisplayRows = (
  parameters: ToolParameter[],
): ToolParameterDisplayRow[] => {
  const rows: ToolParameterDisplayRow[] = [];

  for (const parameter of parameters) {
    rows.push({
      id: parameter.name,
      name: parameter.name,
      path: parameter.name,
      depth: 0,
      paramType: parameter.paramType,
      required: parameter.required,
      description: parameter.description,
      defaultValue: parameter.defaultValue,
      enumValues: parameter.enumValues,
    });

    if (isRecord(parameter.jsonSchema)) {
      appendNestedSchemaRows(rows, parameter.jsonSchema, parameter.name, 1, new WeakSet());
    }
  }

  return rows;
};
