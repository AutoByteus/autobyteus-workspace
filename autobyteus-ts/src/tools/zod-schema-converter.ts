import { ZodTypeAny } from 'zod';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../utils/parameter-schema.js';

type UnwrapResult = {
  schema: ZodTypeAny;
  optional: boolean;
  defaultValue?: unknown;
  description?: string;
};

function extractDescription(schema: ZodTypeAny): string | undefined {
  return (schema as any).description ?? (schema as any)._def?.description;
}

function getTypeName(schema: ZodTypeAny): string | undefined {
  return (schema as any)._def?.typeName ?? (schema as any).constructor?.name;
}

function unwrapSchema(schema: ZodTypeAny): UnwrapResult {
  let current: ZodTypeAny = schema;
  let optional = false;
  let defaultValue: unknown = undefined;
  let description = extractDescription(current);

  while (true) {
    const typeName = getTypeName(current);
    if (typeName === 'ZodOptional') {
      optional = true;
      current = (current as any)._def.innerType;
    } else if (typeName === 'ZodDefault') {
      optional = true;
      const def = (current as any)._def?.defaultValue;
      defaultValue = typeof def === 'function' ? def() : def;
      current = (current as any)._def.innerType;
    } else if (typeName === 'ZodNullable') {
      optional = true;
      current = (current as any)._def.innerType;
    } else if (typeName === 'ZodEffects') {
      current = (current as any)._def.schema;
    } else if (typeName === 'ZodReadonly') {
      current = (current as any)._def.innerType;
    } else {
      break;
    }

    description = description ?? extractDescription(current);
  }

  return { schema: current, optional, defaultValue, description };
}

function getObjectShape(schema: ZodTypeAny): Record<string, ZodTypeAny> {
  const shapeProp = (schema as any).shape;
  if (typeof shapeProp === 'function') {
    return shapeProp();
  }
  if (shapeProp && typeof shapeProp === 'object') {
    return shapeProp as Record<string, ZodTypeAny>;
  }
  const defShape = (schema as any)._def?.shape;
  if (typeof defShape === 'function') {
    return defShape();
  }
  if (defShape && typeof defShape === 'object') {
    return defShape as Record<string, ZodTypeAny>;
  }
  return {};
}

function paramTypeToJsonType(paramType: ParameterType): string {
  if (paramType === ParameterType.FLOAT) {
    return 'number';
  }
  return paramType;
}

function enumValuesFromSchema(schema: ZodTypeAny): string[] | undefined {
  const options = (schema as any).options;
  if (Array.isArray(options)) {
    return options.map((value: unknown) => String(value));
  }
  const values = (schema as any)._def?.values;
  if (values && typeof values === 'object') {
    return Array.from(new Set(Object.values(values).map((value) => String(value))));
  }
  return undefined;
}

function buildArrayItemSchema(schema: ZodTypeAny): ParameterSchema | Record<string, unknown> {
  const unwrapped = unwrapSchema(schema);
  const base = unwrapped.schema;

  if (getTypeName(base) === 'ZodObject') {
    return convertObjectSchema(base);
  }

  const typeInfo = mapSchemaToParameterType(base);
  const item: Record<string, unknown> = { type: paramTypeToJsonType(typeInfo.type) };
  if (typeInfo.enumValues) {
    item.enum = typeInfo.enumValues;
  }
  return item;
}

type MappedType = {
  type: ParameterType;
  enumValues?: string[];
  minValue?: number;
  maxValue?: number;
  pattern?: string;
};

function mapSchemaToParameterType(schema: ZodTypeAny): MappedType {
  const typeName = getTypeName(schema);
  if (typeName === 'ZodString') {
    const checks = (schema as any)._def?.checks ?? [];
    let pattern: string | undefined;
    for (const check of checks) {
      if (check.kind === 'regex' && check.regex) {
        pattern = check.regex.source;
        break;
      }
    }
    return { type: ParameterType.STRING, pattern };
  }

  if (typeName === 'ZodNumber') {
    const checks = (schema as any)._def?.checks ?? [];
    let isInt = false;
    let minValue: number | undefined;
    let maxValue: number | undefined;
    for (const check of checks) {
      if (check.kind === 'int' || check.isInt === true) {
        isInt = true;
      } else if (check.kind === 'min' && typeof check.value === 'number') {
        minValue = check.value;
      } else if (check.kind === 'max' && typeof check.value === 'number') {
        maxValue = check.value;
      }

      if (typeof check.minValue === 'number') {
        minValue = check.minValue;
      }
      if (typeof check.maxValue === 'number') {
        maxValue = check.maxValue;
      }
    }
    return {
      type: isInt ? ParameterType.INTEGER : ParameterType.FLOAT,
      minValue,
      maxValue
    };
  }

  if (typeName === 'ZodBoolean') {
    return { type: ParameterType.BOOLEAN };
  }

  if (typeName === 'ZodEnum' || typeName === 'ZodNativeEnum') {
    return { type: ParameterType.ENUM, enumValues: enumValuesFromSchema(schema) };
  }

  if (typeName === 'ZodArray') {
    return { type: ParameterType.ARRAY };
  }

  if (typeName === 'ZodObject' || typeName === 'ZodRecord' || typeName === 'ZodMap') {
    return { type: ParameterType.OBJECT };
  }

  return { type: ParameterType.STRING };
}

function convertObjectSchema(schema: ZodTypeAny): ParameterSchema {
  const parameterSchema = new ParameterSchema();
  const shape = getObjectShape(schema);

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    const { schema: baseSchema, optional, defaultValue, description } = unwrapSchema(fieldSchema);
    const mapped = mapSchemaToParameterType(baseSchema);

    let objectSchema: ParameterSchema | undefined;
    let arrayItemSchema: ParameterSchema | Record<string, unknown> | undefined;

    if (getTypeName(baseSchema) === 'ZodObject') {
      objectSchema = convertObjectSchema(baseSchema);
    } else if (getTypeName(baseSchema) === 'ZodArray') {
      const elementSchema =
        (baseSchema as any)._def?.element ??
        (baseSchema as any).element ??
        (baseSchema as any)._def?.innerType ??
        (baseSchema as any)._def?.type;
      if (elementSchema) {
        arrayItemSchema = buildArrayItemSchema(elementSchema);
      }
    }

    parameterSchema.addParameter(new ParameterDefinition({
      name: fieldName,
      type: mapped.type,
      description: description ?? `Parameter '${fieldName}'.`,
      required: !optional,
      defaultValue,
      enumValues: mapped.enumValues,
      minValue: mapped.minValue,
      maxValue: mapped.maxValue,
      pattern: mapped.pattern,
      objectSchema,
      arrayItemSchema
    }));
  }

  return parameterSchema;
}

export function zodToParameterSchema(zodModel: ZodTypeAny): ParameterSchema {
  if (getTypeName(zodModel) !== 'ZodObject') {
    throw new Error('zodToParameterSchema expects a ZodObject schema.');
  }
  return convertObjectSchema(zodModel);
}
