import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type { AgentToolMcpInputSchemaSource } from "./agent-tool-mcp-definition-provider.js";

export type AgentToolsMcpInputSchema = Record<string, unknown>;

export class AgentToolsMcpSchemaMapper {
  toMcpInputSchema(schemaSource: AgentToolMcpInputSchemaSource): AgentToolsMcpInputSchema {
    const schema = isParameterSchema(schemaSource)
      ? schemaSource.toJsonSchema()
      : clonePlainSchema(schemaSource);
    return normalizeObjectInputSchema(schema);
  }
}

export const getAgentToolsMcpSchemaMapper = (): AgentToolsMcpSchemaMapper =>
  new AgentToolsMcpSchemaMapper();

const isParameterSchema = (value: AgentToolMcpInputSchemaSource): value is ParameterSchema =>
  typeof (value as ParameterSchema).toJsonSchema === "function";

const clonePlainSchema = (schema: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;

const normalizeObjectInputSchema = (schema: Record<string, unknown>): AgentToolsMcpInputSchema => {
  const normalized: AgentToolsMcpInputSchema = { ...schema };
  if (normalized.type === undefined) {
    normalized.type = "object";
  }
  if (normalized.type === "object" && normalized.additionalProperties === undefined) {
    normalized.additionalProperties = false;
  }
  if (normalized.type === "object" && normalized.properties === undefined) {
    normalized.properties = {};
  }
  if (normalized.type === "object" && normalized.required === undefined) {
    normalized.required = [];
  }
  return normalized;
};
