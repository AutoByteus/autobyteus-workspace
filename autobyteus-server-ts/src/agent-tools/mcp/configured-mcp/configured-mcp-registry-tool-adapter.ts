import { defaultToolRegistry, type ToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import type {
  AgentToolMcpToolAdapter,
  AgentToolMcpToolAdapterExecuteInput,
} from "../agent-tool-mcp-adapter.js";
import { toAgentToolMcpToolResult } from "../agent-tool-mcp-adapter.js";
import type { AgentToolMcpSupportedToolDefinition } from "../agent-tool-mcp-definition-provider.js";
import type { AgentToolMcpSession } from "../agent-tool-mcp-session.js";
import { normalizeConfiguredMcpToolResult } from "./configured-mcp-tool-result-normalizer.js";
import type { ConfiguredMcpAgentToolSource } from "./configured-mcp-agent-tool-source.js";

type ConfiguredMcpRegistryToolAdapterDeps = {
  registry?: Pick<ToolRegistry, "getToolDefinition" | "createTool">;
};

export class ConfiguredMcpRegistryToolAdapter implements AgentToolMcpToolAdapter {
  readonly definition: AgentToolMcpSupportedToolDefinition;

  private readonly registry: Pick<ToolRegistry, "getToolDefinition" | "createTool">;
  private readonly source: ConfiguredMcpAgentToolSource;

  constructor(input: {
    source: ConfiguredMcpAgentToolSource;
    definition: AgentToolMcpSupportedToolDefinition;
    registry?: Pick<ToolRegistry, "getToolDefinition" | "createTool">;
  }) {
    this.source = input.source;
    this.definition = input.definition;
    this.registry = input.registry ?? defaultToolRegistry;
  }

  isAvailable(): boolean {
    return Boolean(this.resolveCurrentValidDefinition());
  }

  async execute(input: AgentToolMcpToolAdapterExecuteInput) {
    const currentDefinition = this.resolveCurrentValidDefinition();
    if (!currentDefinition) {
      throw new Error(`Configured MCP tool '${this.source.registeredToolName}' is no longer available for this session.`);
    }
    const tool = this.registry.createTool(this.source.registeredToolName);
    const result = await tool.execute(
      { agentId: resolveExecutionAgentId(input.session) },
      input.rawArguments,
    );
    return toAgentToolMcpToolResult(normalizeConfiguredMcpToolResult(result));
  }

  private resolveCurrentValidDefinition() {
    const definition = this.registry.getToolDefinition(this.source.registeredToolName);
    if (!definition || definition.origin !== ToolOrigin.MCP) {
      return null;
    }
    return definition.metadata?.["mcp_server_id"] === this.source.mcpServerId
      ? definition
      : null;
  }
}

export const resolveExecutionAgentId = (session: AgentToolMcpSession): string =>
  session.owner.memberRunId?.trim() || session.owner.runId;
