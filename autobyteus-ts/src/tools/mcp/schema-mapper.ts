import { ParameterDefinition, ParameterSchema, ParameterType } from '../../utils/parameter-schema.js';

type JsonObject = Record<string, unknown>;

export class McpSchemaMapper {
  private static readonly MCP_TYPE_TO_AUTOBYTEUS_TYPE_MAP: Record<string, ParameterType> = {
    string: ParameterType.STRING,
    integer: ParameterType.INTEGER,
    number: ParameterType.FLOAT,
    boolean: ParameterType.BOOLEAN,
    object: ParameterType.OBJECT,
    array: ParameterType.ARRAY
  };

  mapToAutobyteusSchema(mcpJsonSchema: JsonObject): ParameterSchema {
    if (!mcpJsonSchema || typeof mcpJsonSchema !== 'object' || Array.isArray(mcpJsonSchema)) {
      throw new Error('MCP JSON schema must be a dictionary.');
    }

    const autobyteusSchema = new ParameterSchema();
    const schemaType = (mcpJsonSchema as JsonObject).type;

    if (schemaType !== 'object') {
      throw new Error(`MCP JSON schema root 'type' must be 'object', got '${schemaType}'.`);
    }

    const properties = (mcpJsonSchema as JsonObject).properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
      return autobyteusSchema;
    }

    const requiredRaw = (mcpJsonSchema as JsonObject).required;
    const requiredParamsAtThisLevel = Array.isArray(requiredRaw)
      ? requiredRaw.filter((item): item is string => typeof item === 'string')
      : [];

    for (const [paramName, paramMcpSchema] of Object.entries(properties)) {
      if (!paramMcpSchema || typeof paramMcpSchema !== 'object' || Array.isArray(paramMcpSchema)) {
        continue;
      }

      const paramSchema = paramMcpSchema as JsonObject;
      const effectiveParamSchema = this.resolveEffectivePropertySchema(paramSchema);
      const mcpParamType =
        typeof effectiveParamSchema.type === 'string' ? effectiveParamSchema.type : undefined;
      const description =
        typeof effectiveParamSchema.description === 'string' && effectiveParamSchema.description.trim()
          ? effectiveParamSchema.description
          : `Parameter '${paramName}'.`;

      let nestedObjectSchema: ParameterSchema | undefined;
      let itemSchemaForArray: ParameterType | ParameterSchema | Record<string, unknown> | undefined;

      if (mcpParamType === 'object' && 'properties' in effectiveParamSchema) {
        nestedObjectSchema = this.mapToAutobyteusSchema(effectiveParamSchema);
      } else if (mcpParamType === 'array') {
        const items = effectiveParamSchema.items;
        if (items instanceof ParameterSchema) {
          itemSchemaForArray = items;
        } else if (typeof items === 'string' && Object.values(ParameterType).includes(items as ParameterType)) {
          itemSchemaForArray = items as ParameterType;
        } else if (items && typeof items === 'object' && !Array.isArray(items)) {
          itemSchemaForArray = items as Record<string, unknown>;
        }
      }

      let autobyteusParamType =
        (mcpParamType ? McpSchemaMapper.MCP_TYPE_TO_AUTOBYTEUS_TYPE_MAP[mcpParamType] : undefined) ??
        ParameterType.STRING;

      const enumValues = effectiveParamSchema.enum;
      if (autobyteusParamType === ParameterType.STRING && Array.isArray(enumValues)) {
        autobyteusParamType = ParameterType.ENUM;
      }

      try {
        const paramDef = new ParameterDefinition({
          name: paramName,
          type: autobyteusParamType,
          description,
          required: requiredParamsAtThisLevel.includes(paramName),
          defaultValue: effectiveParamSchema.default,
          enumValues: autobyteusParamType === ParameterType.ENUM && Array.isArray(enumValues) ? enumValues : undefined,
          minValue: typeof effectiveParamSchema.minimum === 'number' ? effectiveParamSchema.minimum : undefined,
          maxValue: typeof effectiveParamSchema.maximum === 'number' ? effectiveParamSchema.maximum : undefined,
          pattern: typeof effectiveParamSchema.pattern === 'string' ? effectiveParamSchema.pattern : undefined,
          arrayItemSchema: mcpParamType === 'array' ? itemSchemaForArray : undefined,
          objectSchema: nestedObjectSchema
        });
        autobyteusSchema.addParameter(paramDef);
      } catch {
        continue;
      }
    }

    return autobyteusSchema;
  }

  private resolveEffectivePropertySchema(paramSchema: JsonObject): JsonObject {
    return (
      this.resolveNullableUnionSchema(paramSchema, 'anyOf') ??
      this.resolveNullableUnionSchema(paramSchema, 'oneOf') ??
      this.resolveNullableTypeArraySchema(paramSchema) ??
      paramSchema
    );
  }

  private resolveNullableUnionSchema(paramSchema: JsonObject, unionKey: 'anyOf' | 'oneOf'): JsonObject | undefined {
    const unionValue = paramSchema[unionKey];
    if (!Array.isArray(unionValue)) {
      return undefined;
    }

    const branches = unionValue.filter(
      (branch): branch is JsonObject => Boolean(branch) && typeof branch === 'object' && !Array.isArray(branch)
    );
    if (branches.length !== unionValue.length) {
      return undefined;
    }

    const nonNullBranches = branches.filter((branch) => !this.isNullSchema(branch));
    const hasNullBranch = nonNullBranches.length < branches.length;
    if (!hasNullBranch || nonNullBranches.length !== 1) {
      return undefined;
    }

    return this.mergeOuterPropertyMetadata(paramSchema, nonNullBranches[0]);
  }

  private resolveNullableTypeArraySchema(paramSchema: JsonObject): JsonObject | undefined {
    const schemaTypes = paramSchema.type;
    if (!Array.isArray(schemaTypes)) {
      return undefined;
    }

    const stringTypes = schemaTypes.filter((schemaType): schemaType is string => typeof schemaType === 'string');
    if (stringTypes.length !== schemaTypes.length) {
      return undefined;
    }

    const nonNullTypes = stringTypes.filter((schemaType) => schemaType !== 'null');
    const hasNullType = nonNullTypes.length < stringTypes.length;
    if (!hasNullType || nonNullTypes.length !== 1) {
      return undefined;
    }

    return { ...paramSchema, type: nonNullTypes[0] };
  }

  private isNullSchema(schema: JsonObject): boolean {
    return schema.type === 'null';
  }

  private mergeOuterPropertyMetadata(outerSchema: JsonObject, effectiveSchema: JsonObject): JsonObject {
    const metadataKeys = [
      'description',
      'default',
      'title',
      'enum',
      'minimum',
      'maximum',
      'pattern',
      'examples',
      'deprecated'
    ];
    const merged: JsonObject = { ...effectiveSchema };
    for (const key of metadataKeys) {
      if (key in outerSchema) {
        merged[key] = outerSchema[key];
      }
    }
    return merged;
  }
}
