import { readFileSync } from "node:fs";
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
import { MemberExecutionContext } from "../../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";

const generalAgentConfig = JSON.parse(readFileSync(
  new URL("../../../../src/built-in-agents/templates/daily-assistant/agent-config.json", import.meta.url),
  "utf-8",
)) as { toolNames: string[] };

const listed = [
  { name: "Research Engineer", kind: "agent" as const, address: "/research_engineer" as never, description: "Research" },
  { name: "Product Team", kind: "agent_team" as const, address: "/product_team" as never, description: "Product" },
];
const withLister = () => testMemberExecutionContext({ listAvailableAgents: vi.fn(async () => listed) });
const withoutLister = () => testMemberExecutionContext();

describe("list_available_agents (REQ-001/002)", () => {
  it("exposes actual Daily Assistant discovery through native and MCP bindings in a standalone host context", async () => {
    const context = new MemberExecutionContext({ ...withLister(), teamScoped: false });
    const exposure = buildRuntimeAgentToolExposure(generalAgentConfig.toolNames, context);
    expect(exposure.listAvailableAgentsEnabled).toBe(true);
    expect(exposure.sendMessageToEnabled).toBe(true);
    expect(exposure.enabledTaskDelegationToolNames).toContain("delegate_task");
    expect(exposure.getHandoffRulesEnabled).toBe(false);
    const resolved = resolveAutoByteusAgentTools({
      agentDefinition: { name: "Daily Assistant", toolNames: generalAgentConfig.toolNames } as never,
      runtimeToolExposure: exposure,
      senderRunId: "run-general-agent",
      memberExecutionContext: context,
      logger: { warn: vi.fn(), error: vi.fn() },
    });
    expect(resolved.actualToolNames.filter((name) => name === LIST_AVAILABLE_AGENTS_TOOL_NAME)).toHaveLength(1);
    const tool = resolved.tools.find((candidate) =>
      (candidate.constructor as { getName?: () => string }).getName?.() === LIST_AVAILABLE_AGENTS_TOOL_NAME)!;
    expect(JSON.parse(await (tool as unknown as { _execute(): Promise<string> })._execute())).toEqual({ agents: listed });

    const [adapter] = new ListAvailableAgentsMcpAdapterProvider().getAdapters();
    const availability = (memberExecutionContext: typeof context | null) => adapter!.isAvailable({
      runtimeExposure: exposure,
      sender: memberExecutionContext ? { memberExecutionContext } as never : null,
      executionContext: {} as never,
      applicationAgentTools: null,
    });
    expect(availability(context)).toBe(true);
    expect(availability(withoutLister())).toBe(false);
    expect(availability(null)).toBe(false);
    await expect(adapter!.execute({
      session: { sender: { memberExecutionContext: context } } as never,
      rawArguments: {},
    })).resolves.toMatchObject({ kind: "mcp_tool_result", result: { structuredContent: { agents: listed } } });

    const claude = resolveClaudeSessionToolingOptions({
      runtimeToolExposure: exposure,
      hasMaterializedSkills: false,
      memberExecutionContext: context,
    });
    expect(claude.listAvailableAgentsToolingEnabled).toBe(true);
    expect(claude.agentToolsMcpEnabledToolNames).toContain(LIST_AVAILABLE_AGENTS_TOOL_NAME);
  });

  it("keeps an empty eligible catalog a valid discovery result for Daily Assistant", async () => {
    const context = new MemberExecutionContext({
      ...testMemberExecutionContext({ listAvailableAgents: async () => [] }),
      teamScoped: false,
    });
    expect(buildRuntimeAgentToolExposure(generalAgentConfig.toolNames, context).listAvailableAgentsEnabled).toBe(true);
    await expect(listAvailableAgentsFor(context.collaboration)).resolves.toEqual({ agents: [] });
  });

  it("is a registry tool for the picker, with the REQ-009 wording", () => {
    const definition = ensureListAvailableAgentsToolRegistered();
    expect(defaultToolRegistry.getToolDefinition(LIST_AVAILABLE_AGENTS_TOOL_NAME)).toBe(definition);
    expect(definition.origin).toBe(ToolOrigin.LOCAL);
    expect(definition.category).toBe(ToolCategory.AGENT_COMMUNICATION);
    expect(LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION).toContain("reaches the one instance at that address");
    expect(LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION).toContain("with an address spawns a new copy (with a copy's own ID it gives that copy a new Task)");
    expect(LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION).toContain("message a copy by its agent run ID (a Team copy's coordinator)");
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
    // Only the unlistable sender is warned about (other automatic tools are not registered in this unit test).
    expect(logger.warn.mock.calls.filter(([message]) => String(message).includes(LIST_AVAILABLE_AGENTS_TOOL_NAME))).toHaveLength(1);
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
