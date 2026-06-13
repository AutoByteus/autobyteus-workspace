import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";

export type AgentToolMcpInputSchemaSource = ParameterSchema | Record<string, unknown>;

export type AgentToolMcpSupportedToolDefinition = {
  name: string;
  description: string;
  inputSchema: AgentToolMcpInputSchemaSource;
};

export type AgentToolMcpDefinitionProvider = {
  getDefinition(): AgentToolMcpSupportedToolDefinition;
};
