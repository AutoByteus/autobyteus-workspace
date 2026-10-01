import { describe, expect, it, vi } from "vitest";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import {
  LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION,
  LIST_AVAILABLE_AGENTS_TOOL_NAME,
  listAvailableAgentsFor,
} from "../../../../src/agent-tools/agent-discovery/list-available-agents-contract.js";
import { ensureListAvailableAgentsToolRegistered } from "../../../../src/agent-tools/agent-discovery/list-available-agents-tool.js";
import { ListAvailableAgentsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/list-available-agents-mcp-adapter-provider.js";
import {
  automaticCollaborationToolNames,
  buildRuntimeAgentToolExposure,
} from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { resolveAutoByteusAgentTools } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.js";
import { resolveClaudeSessionToolingOptions } from "../../../../src/agent-execution/backends/claude/session/claude-session-tooling-options.js";
import { buildClaudeAgentToolsMcpToolName } from "../../../../src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-tool-name.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";

const listed = [
  { name: "Product Team", kind: "agent_team" as const, address: "/product_team" as never, description: "Product" },
];
const withLister = () => testMemberExecutionContext({ listAvailableAgents: vi.fn(async () => listed) });
const withoutLister = () => testMemberExecutionContext();

describe("list_available_agents (REQ-001/002)", () => {
  it("is a registry tool for the picker, with the REQ-009 wording", () => {
    const definition = ensureListAvailableAgentsToolRegistered();
    expect(defaultToolRegistry.getToolDefinition(LIST_AVAILABLE_AGENTS_TOOL_NAME)).toBe(definition);
    expect(definition.origin).toBe(ToolOrigin.LOCAL);
    expect(definition.category).toBe(ToolCategory.AGENT_COMMUNICATION);
    expect(LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION).toContain("reaches the one instance at that address");
    expect(LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION).toContain("always spawns a new copy");
    expect(LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION).toContain("by its run ID");
  });

  it("is opt-in: never automatic, exposed only when the definition selects it", () => {
    expect(automaticCollaborationToolNames(withLister())).not.toContain(LIST_AVAILABLE_AGENTS_TOOL_NAME);
    expect(buildRuntimeAgentToolExposure(["run_bash"], withLister()).listAvailableAgentsEnabled).toBe(false);
    expect(buildRuntimeAgentToolExposure([" list_available_agents "], withLister()).listAvailableAgentsEnabled).toBe(true);
  });

  it("returns { agents: [{name, kind, address, description}] } and rejects a run without a catalog", async () => {
    await expect(listAvailableAgentsFor(withLister().collaboration)).resolves.toEqual({ agents: listed });
    await expect(listAvailableAgentsFor(withoutLister().collaboration)).rejects.toMatchObject({ code: "COLLABORATION_CONTEXT_REQUIRED" });
    await expect(listAvailableAgentsFor(null)).rejects.toMatchObject({ code: "COLLABORATION_CONTEXT_REQUIRED" });
  });

  it("binds the AutoByteus tool to the sender's member context, and skips it where nothing can be listed", async () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    const resolve = (context: ReturnType<typeof withLister> | null, toolNames: string[]) => resolveAutoByteusAgentTools({
      agentDefinition: { name: "PM", toolNames } as never,
      runtimeToolExposure: buildRuntimeAgentToolExposure(toolNames, context),
      senderRunId: "run-pm",
      memberExecutionContext: context,
      logger,
    });
    const bound = resolve(withLister(), [LIST_AVAILABLE_AGENTS_TOOL_NAME]);
    expect(bound.actualToolNames).toContain(LIST_AVAILABLE_AGENTS_TOOL_NAME);
    const tool = bound.tools.find((candidate) => (candidate.constructor as { getName?: () => string }).getName?.() === LIST_AVAILABLE_AGENTS_TOOL_NAME)!;
    expect(JSON.parse(await (tool as unknown as { _execute(): Promise<string> })._execute())).toEqual({ agents: listed });
    expect(resolve(withoutLister(), [LIST_AVAILABLE_AGENTS_TOOL_NAME]).actualToolNames).not.toContain(LIST_AVAILABLE_AGENTS_TOOL_NAME);
    expect(resolve(withLister(), []).actualToolNames).not.toContain(LIST_AVAILABLE_AGENTS_TOOL_NAME);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("is an Agent Tools MCP adapter for the other runtimes, available only to a sender that can list", async () => {
    const [adapter] = new ListAvailableAgentsMcpAdapterProvider().getAdapters();
    expect(adapter!.definition).toMatchObject({ name: LIST_AVAILABLE_AGENTS_TOOL_NAME, description: LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION });
    const availability = (memberExecutionContext: ReturnType<typeof withLister> | null) => adapter!.isAvailable({
      runtimeExposure: buildRuntimeAgentToolExposure([LIST_AVAILABLE_AGENTS_TOOL_NAME]),
      sender: memberExecutionContext ? { memberExecutionContext } as never : null,
      executionContext: {} as never,
      applicationAgentTools: null,
    });
    expect(availability(withLister())).toBe(true);
    expect(availability(withoutLister())).toBe(false);
    expect(availability(null)).toBe(false);
    const result = await adapter!.execute({ session: { sender: { memberExecutionContext: withLister() } } as never, rawArguments: {} });
    expect(result).toMatchObject({ kind: "mcp_tool_result", result: { structuredContent: { agents: listed } } });
  });

  it("adds the tool to Claude's Agent Tools MCP set only when selected and listable", () => {
    const options = (toolNames: string[], context: ReturnType<typeof withLister>) => resolveClaudeSessionToolingOptions({
      runtimeToolExposure: buildRuntimeAgentToolExposure(toolNames, context),
      hasMaterializedSkills: false,
      memberExecutionContext: context,
    });
    const selected = options([LIST_AVAILABLE_AGENTS_TOOL_NAME], withLister());
    expect(selected.listAvailableAgentsToolingEnabled).toBe(true);
    expect(selected.agentToolsMcpEnabledToolNames).toContain(LIST_AVAILABLE_AGENTS_TOOL_NAME);
    expect(selected.allowedTools).toContain(buildClaudeAgentToolsMcpToolName(LIST_AVAILABLE_AGENTS_TOOL_NAME));
    expect(options([], withLister()).agentToolsMcpEnabledToolNames).not.toContain(LIST_AVAILABLE_AGENTS_TOOL_NAME);
    expect(options([LIST_AVAILABLE_AGENTS_TOOL_NAME], withoutLister()).listAvailableAgentsToolingEnabled).toBe(false);
  });
});
