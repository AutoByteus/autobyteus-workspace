import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type { ZodType } from "zod";

export type AgentToolMcpInputSchemaSource = ParameterSchema | Record<string, unknown>;
export type AgentToolMcpOutputSchemaSource = ZodType;

export type AgentToolMcpSupportedToolDefinition = {
  name: string;
  description: string;
  inputSchema: AgentToolMcpInputSchemaSource;
  outputSchema?: AgentToolMcpOutputSchemaSource;
};

export type AgentToolMcpDefinitionProvider = {
  getDefinition(): AgentToolMcpSupportedToolDefinition;
};
