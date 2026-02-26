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
      const mcpParamType = typeof paramSchema.type === 'string' ? paramSchema.type : undefined;
      const description =
        typeof paramSchema.description === 'string' && paramSchema.description.trim()
          ? paramSchema.description
          : `Parameter '${paramName}'.`;

      let nestedObjectSchema: ParameterSchema | undefined;
      let itemSchemaForArray: ParameterType | ParameterSchema | Record<string, unknown> | undefined;

      if (mcpParamType === 'object' && 'properties' in paramSchema) {
        nestedObjectSchema = this.mapToAutobyteusSchema(paramSchema);
      } else if (mcpParamType === 'array') {
        const items = paramSchema.items;
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

      const enumValues = paramSchema.enum;
      if (autobyteusParamType === ParameterType.STRING && Array.isArray(enumValues)) {
        autobyteusParamType = ParameterType.ENUM;
      }

      try {
        const paramDef = new ParameterDefinition({
          name: paramName,
          type: autobyteusParamType,
          description,
          required: requiredParamsAtThisLevel.includes(paramName),
          defaultValue: paramSchema.default,
          enumValues: autobyteusParamType === ParameterType.ENUM && Array.isArray(enumValues) ? enumValues : undefined,
          minValue: typeof paramSchema.minimum === 'number' ? paramSchema.minimum : undefined,
          maxValue: typeof paramSchema.maximum === 'number' ? paramSchema.maximum : undefined,
          pattern: typeof paramSchema.pattern === 'string' ? paramSchema.pattern : undefined,
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
}
