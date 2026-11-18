import { describe, expect, it, vi } from "vitest";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { ConfiguredMcpRegistryToolAdapter } from "../../../../../src/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.js";
import { CONFIGURED_MCP_AGENT_TOOL_SOURCE_KIND } from "../../../../../src/agent-tools/mcp/configured-mcp/configured-mcp-agent-tool-source.js";

const TOOL = "tok_probe";
const session = { owner: { runId: "run-1", collaborationIdentity: null } } as never;
const mcpDefinition = { origin: ToolOrigin.MCP, metadata: { mcp_server_id: "tok" } };

const build = (input: { execute?: () => Promise<unknown>; definition?: unknown }) => {
  const execute = vi.fn(input.execute ?? (async () => ({ content: [{ type: "text", text: "ok" }] })));
  const registry = {
    getToolDefinition: vi.fn(() => ("definition" in input ? input.definition : mcpDefinition)),
    createTool: vi.fn(() => ({ execute })),
  };
  const adapter = new ConfiguredMcpRegistryToolAdapter({
    source: { kind: CONFIGURED_MCP_AGENT_TOOL_SOURCE_KIND, registeredToolName: TOOL, mcpServerId: "tok" },
    definition: { name: TOOL } as never,
    registry: registry as never,
  });
  return { adapter, registry, execute };
};

describe("ConfiguredMcpRegistryToolAdapter.execute", () => {
  it("returns the tool's failure as an isError result with its message instead of throwing", async () => {
    const { adapter, execute } = build({
      execute: async () => { throw new Error("HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized"); },
    });

    await expect(adapter.execute({ session, rawArguments: { q: 1 } })).resolves.toEqual({
      kind: "mcp_tool_result",
      result: { content: [{ type: "text", text: "HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized" }], isError: true },
    });
    expect(execute).toHaveBeenCalledWith({ agentId: "run-1" }, { q: 1 });
  });

  it("uses the thrown value's text when it is not an Error", async () => {
    const { adapter } = build({ execute: async () => { throw "connection closed"; } });

    await expect(adapter.execute({ session, rawArguments: {} })).resolves.toEqual({
      kind: "mcp_tool_result",
      result: { content: [{ type: "text", text: "connection closed" }], isError: true },
    });
  });

  it.each([
    ["missing", null],
    ["no longer an MCP tool", { origin: ToolOrigin.LOCAL, metadata: {} }],
    ["of another server", { origin: ToolOrigin.MCP, metadata: { mcp_server_id: "other" } }],
  ])("returns an isError result when the tool is no longer available at call time (%s)", async (_case, definition) => {
    const { adapter, registry } = build({ definition });

    await expect(adapter.execute({ session, rawArguments: {} })).resolves.toEqual({
      kind: "mcp_tool_result",
      result: { content: [{ type: "text", text: `Configured MCP tool '${TOOL}' is no longer available for this session.` }], isError: true },
    });
    expect(registry.createTool).not.toHaveBeenCalled();
  });

  it("returns the tool's normal and isError results unchanged", async () => {
    const success = build({ execute: async () => ({ content: [{ type: "text", text: "MARKER" }] }) });
    await expect(success.adapter.execute({ session, rawArguments: {} })).resolves.toEqual({
      kind: "mcp_tool_result", result: { content: [{ type: "text", text: "MARKER" }] },
    });

    const reported = build({ execute: async () => ({ content: [{ type: "text", text: "remote said no" }], isError: true }) });
    await expect(reported.adapter.execute({ session, rawArguments: {} })).resolves.toEqual({
      kind: "mcp_tool_result", result: { content: [{ type: "text", text: "remote said no" }], isError: true },
    });
  });
});
