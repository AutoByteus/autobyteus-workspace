import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GraphQLError } from "graphql";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_DESCRIPTION, LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME, LIST_AVAILABLE_AGENT_RUNTIMES_UNAVAILABLE,
} from "../../../../src/agent-tools/agent-runtimes/list-available-agent-runtimes-contract.js";
import { registerAgentRuntimesTools } from "../../../../src/agent-tools/agent-runtimes/register-agent-runtimes-tools.js";
import { ListAvailableAgentRuntimesMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/list-available-agent-runtimes-mcp-adapter-provider.js";
import { buildDefaultAgentToolMcpAdapterProviders } from "../../../../src/agent-tools/mcp/providers/default-agent-tool-mcp-adapter-providers.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { automaticCollaborationToolNames, buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { resolveAutoByteusAgentTools } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.js";
import { AvailableAgentRuntimesResolver } from "../../../../src/api/graphql/types/available-agent-runtimes.js";
import {
  configureAvailableAgentRuntimesService, type AvailableAgentRuntimesService,
} from "../../../../src/available-agent-runtimes/available-agent-runtimes-service.js";
import type { AvailableAgentRuntimesReport } from "../../../../src/available-agent-runtimes/available-agent-runtimes-report.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";

const REPORT: AvailableAgentRuntimesReport = {
  checkedAt: "2026-10-25T10:00:00.000Z",
  agentRuntimes: [
    { runtime: "grok_build", name: "Grok", limits: [{ name: "Billing period", remainingPercent: null, resetsAt: "2026-10-29T00:00:00.000Z" }],
      limitsNote: "Grok does not report how much of the period is used.", models: [{ id: "grok-4.7", name: "Grok 4.7", contextTokens: 256_000 }] },
    { runtime: "autobyteus", name: "AutoByteus", providers: [
      { provider: "OpenAI", limits: "not reported", models: [{ id: "gpt-6", name: "GPT-6" }] },
      { provider: "DeepSeek", balance: "0.00 USD", blocked: "Out of balance", models: [{ id: "deepseek-v5", name: "DeepSeek V5", blocked: { until: null, by: "Out of balance" } }] },
    ] },
  ],
};

/** The report as the tool gives it, by the one tool result rule (autobyteus-260): a null `remainingPercent` or `until` is left out. */
const TOOL_RESULT = {
  checkedAt: "2026-10-25T10:00:00.000Z",
  agentRuntimes: [
    { runtime: "grok_build", name: "Grok", limits: [{ name: "Billing period", resetsAt: "2026-10-29T00:00:00.000Z" }],
      limitsNote: "Grok does not report how much of the period is used.", models: [{ id: "grok-4.7", name: "Grok 4.7", contextTokens: 256_000 }] },
    { runtime: "autobyteus", name: "AutoByteus", providers: [
      { provider: "OpenAI", limits: "not reported", models: [{ id: "gpt-6", name: "GPT-6" }] },
      { provider: "DeepSeek", balance: "0.00 USD", blocked: "Out of balance", models: [{ id: "deepseek-v5", name: "DeepSeek V5", blocked: { by: "Out of balance" } }] },
    ] },
  ],
};

let binding: { close(): void } | null = null;
const bindService = () => {
  const read = vi.fn(async () => REPORT);
  binding = configureAvailableAgentRuntimesService({ read } as unknown as AvailableAgentRuntimesService);
  return read;
};
afterEach(() => { binding?.close(); binding = null; });

const catalog = () => new AgentToolMcpCatalog({ providers: [new ListAvailableAgentRuntimesMcpAdapterProvider()] });
const mcpContext = (toolNames: string[]) => ({
  runtimeExposure: buildRuntimeAgentToolExposure(toolNames, null), sender: null, executionContext: {} as never, applicationAgentTools: null,
});

describe("list_available_agent_runtimes", () => {
  it("is opt-in: never added automatically, exposed only to definitions that list it (AC-012)", () => {
    expect(automaticCollaborationToolNames(testMemberExecutionContext())).not.toContain(LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME);
    expect(catalog().resolveConfiguredSupportedToolNames(mcpContext(["read_file"]))).toEqual([]);
    registerAgentRuntimesTools();
    const resolved = resolveAutoByteusAgentTools({ agentDefinition: { name: "Assistant", toolNames: [] } as never,
      runtimeToolExposure: buildRuntimeAgentToolExposure([], null), senderRunId: "run-a", memberExecutionContext: null,
      logger: { warn: vi.fn(), error: vi.fn() } });
    expect(resolved.actualToolNames).not.toContain(LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME);
  });

  it("on the AutoByteus runtime: registered in the tool picker, answers the node's report as JSON by the one result rule (AC-001)", async () => {
    const read = bindService();
    registerAgentRuntimesTools();
    expect(defaultToolRegistry.getToolDefinition(LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME)?.description)
      .toBe(LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_DESCRIPTION);
    // No team or member context needed: a standalone agent gets it too.
    const resolved = resolveAutoByteusAgentTools({ agentDefinition: { name: "Router", toolNames: [LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME] } as never,
      runtimeToolExposure: buildRuntimeAgentToolExposure([LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME], null), senderRunId: "run-a",
      memberExecutionContext: null, logger: { warn: vi.fn(), error: vi.fn() } });
    expect(resolved.actualToolNames).toEqual([LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME]);
    const tool = resolved.tools[0] as unknown as { _execute(): Promise<string> };
    const text = await tool._execute();
    expect(text).toBe(JSON.stringify(TOOL_RESULT));
    expect(JSON.parse(text)).toEqual(TOOL_RESULT);
    expect(read).toHaveBeenCalledOnce();
  });

  it("over Agent Tools MCP (Claude, Codex, Antigravity, Grok): the same report by the same rule, when the definition lists it (AC-002)", async () => {
    bindService();
    expect(buildDefaultAgentToolMcpAdapterProviders().some((provider) => provider instanceof ListAvailableAgentRuntimesMcpAdapterProvider)).toBe(true);
    expect(catalog().resolveConfiguredSupportedToolNames(mcpContext([LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME])))
      .toEqual([LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME]);
    const [adapter] = new ListAvailableAgentRuntimesMcpAdapterProvider().getAdapters();
    expect(adapter!.definition.description).toBe(LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_DESCRIPTION);
    await expect(adapter!.execute({ session: {} as never, rawArguments: {} })).resolves.toEqual({ kind: "mcp_tool_result",
      result: { content: [{ type: "text", text: JSON.stringify(TOOL_RESULT) }], structuredContent: TOOL_RESULT } });
  });

  it("on a server that does not compose it: the not-available text, as the tool's error", async () => {
    registerAgentRuntimesTools();
    const tool = defaultToolRegistry.createTool(LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME) as unknown as { _execute(): Promise<string> };
    await expect(tool._execute()).rejects.toThrow(LIST_AVAILABLE_AGENT_RUNTIMES_UNAVAILABLE);
    const [adapter] = new ListAvailableAgentRuntimesMcpAdapterProvider().getAdapters();
    await expect(adapter!.execute({ session: {} as never, rawArguments: {} })).resolves.toEqual({ kind: "mcp_tool_result",
      result: { content: [{ type: "text", text: LIST_AVAILABLE_AGENT_RUNTIMES_UNAVAILABLE }], isError: true } });
  });
});

describe("GraphQL availableAgentRuntimes (AC-010)", () => {
  it("returns the service's report as it is (GraphQL keeps its nulls; only tool results follow the tool result rule)", async () => {
    bindService();
    await expect(new AvailableAgentRuntimesResolver().availableAgentRuntimes()).resolves.toEqual(REPORT);
  });

  it("refuses with a code where the service is not composed", async () => {
    const error = await new AvailableAgentRuntimesResolver().availableAgentRuntimes().catch((value: unknown) => value);
    expect(error).toBeInstanceOf(GraphQLError);
    expect((error as GraphQLError).extensions.code).toBe("AVAILABLE_AGENT_RUNTIMES_UNAVAILABLE");
  });
});
