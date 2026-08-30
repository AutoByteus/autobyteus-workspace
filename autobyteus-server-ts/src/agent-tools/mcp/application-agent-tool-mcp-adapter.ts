import type { ApplicationAgentToolCapability } from "../../application-agent-tools/services/application-agent-tool-capability.js";
import type { ApplicationAgentToolRoute } from "../../application-agent-tools/domain/application-agent-tool-route.js";
import { applicationAgentToolSafeFailure } from "../../application-agent-tools/domain/application-agent-tool-errors.js";
import {
  toAgentToolMcpToolResult,
  type AgentToolMcpToolAdapter,
} from "./agent-tool-mcp-adapter.js";
import type { McpToolResult } from "./agent-tools-mcp-result-mapper.js";

export const createApplicationAgentToolMcpAdapter = (input: Readonly<{
  capability: ApplicationAgentToolCapability;
  route: ApplicationAgentToolRoute;
}>): AgentToolMcpToolAdapter => ({
  definition: {
    name: input.route.declarationSnapshot.declaration.name,
    description: input.route.declarationSnapshot.declaration.description,
    inputSchema: input.route.declarationSnapshot.declaration.inputSchema,
  },
  isAvailable: () => true,
  execute: async ({ rawArguments }) => {
    try {
      const result = await input.capability.invoke({
        route: input.route,
        arguments: rawArguments,
      });
      const mcpResult: McpToolResult = {
        content: result.content.map((block) => structuredClone(block)),
        ...(result.structuredContent === undefined
          ? {}
          : { structuredContent: structuredClone(result.structuredContent) }),
        ...(result.isError === undefined ? {} : { isError: result.isError }),
      };
      return toAgentToolMcpToolResult(mcpResult);
    } catch (error) {
      const failure = applicationAgentToolSafeFailure(error);
      return toAgentToolMcpToolResult({
        content: [{ type: "text", text: failure.message }],
        isError: true,
        structuredContent: { code: failure.code },
      });
    }
  },
});
