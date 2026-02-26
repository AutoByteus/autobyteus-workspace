import {
  ParameterDefinition,
  ParameterType,
  ToolOrigin,
} from "autobyteus-ts";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import {
  ToolArgumentSchema,
  ToolDefinitionDetail,
  ToolOriginEnum,
  ToolParameterDefinition,
  ToolParameterTypeEnum,
} from "../types/tool-definition.js";

const toParameterTypeEnum = (value: ParameterType): ToolParameterTypeEnum => {
  switch (value) {
    case ParameterType.STRING:
      return ToolParameterTypeEnum.STRING;
    case ParameterType.INTEGER:
      return ToolParameterTypeEnum.INTEGER;
    case ParameterType.FLOAT:
      return ToolParameterTypeEnum.FLOAT;
    case ParameterType.BOOLEAN:
      return ToolParameterTypeEnum.BOOLEAN;
    case ParameterType.ENUM:
      return ToolParameterTypeEnum.ENUM;
    case ParameterType.OBJECT:
      return ToolParameterTypeEnum.OBJECT;
    case ParameterType.ARRAY:
      return ToolParameterTypeEnum.ARRAY;
    default:
      return ToolParameterTypeEnum.STRING;
  }
};

const toOriginEnum = (value: ToolOrigin): ToolOriginEnum =>
  value === ToolOrigin.MCP ? ToolOriginEnum.MCP : ToolOriginEnum.LOCAL;

export class ToolDefinitionConverter {
  static toGraphql(coreDefinition: ToolDefinition): ToolDefinitionDetail {
    const argumentSchema = coreDefinition.argumentSchema;
    const schema = argumentSchema
      ? {
          parameters: argumentSchema.parameters.map((param) =>
            ToolDefinitionConverter.paramToGraphql(param),
          ),
        }
      : null;

    return {
      name: coreDefinition.name,
      description: coreDefinition.description,
      origin: toOriginEnum(coreDefinition.origin),
      category: coreDefinition.category,
      argumentSchema: schema ? (schema as ToolArgumentSchema) : null,
    };
  }

  static paramToGraphql(coreParam: ParameterDefinition): ToolParameterDefinition {
    const defaultValue =
      coreParam.defaultValue === undefined || coreParam.defaultValue === null
        ? null
        : String(coreParam.defaultValue);

    return {
      name: coreParam.name,
      paramType: toParameterTypeEnum(coreParam.type),
      description: coreParam.description,
      required: coreParam.required,
      defaultValue,
      enumValues: coreParam.enumValues ?? null,
    };
  }
}
