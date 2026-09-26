import { describe, expect, it } from "vitest";
import { grokBuildSessionProfile } from "../../../../../src/agent-execution/backends/grok/grok-build-session-profile.js";
import { readFixture } from "../acp/acp-fake-agent-harness.js";

const context = { sessionId: "s-1", turnId: "t-1", callOrdinal: 3, model: "grok-4.7" };

describe("grokBuildSessionProfile", () => {
  it("injects the composed prompt as rules and mirrors auto-execute as yoloMode, nothing else", () => {
    expect(grokBuildSessionProfile.newSessionMeta({ composedPrompt: "You are X", autoExecuteTools: true }))
      .toEqual({ rules: "You are X", yoloMode: true });
  });

  it("attaches Agent Tools MCP over HTTP and requires its readiness", () => {
    const descriptor = { name: "autobyteus_agent_tools" as const, transport: "streamable_http" as const, serverUrl: "http://h/mcp", enabledTools: [] };
    expect(grokBuildSessionProfile.mcpServers(descriptor)).toEqual([{ type: "http", name: "autobyteus_agent_tools", url: "http://h/mcp", headers: [] }]);
    expect(grokBuildSessionProfile.mcpServers(null)).toEqual([]);
    expect(grokBuildSessionProfile.mcpReadiness(descriptor)).toEqual({ serverName: "autobyteus_agent_tools", timeoutMs: 15_000 });
    expect(grokBuildSessionProfile.mcpReadiness(null)).toBeNull();
  });

  it("turns response_completed into one per-call usage payload and ignores turn totals and bookkeeping", () => {
    const effects = readFixture("prompt").filter((row) => row.dir === "in" && typeof row.msg.method === "string" && row.msg.method.startsWith("_x.ai/"))
      .flatMap((row) => grokBuildSessionProfile.interpretExtNotification(row.msg.method, row.msg.params, context));
    expect(effects).toHaveLength(2);
    expect(effects.every((effect) => effect.kind === "usage")).toBe(true);
    expect(effects[0]).toEqual({ kind: "usage", payload: expect.objectContaining({
      idempotency_key: "grok_build:s-1:t-1:3", call_sequence: 3, usage_scope: "per_call", input_token_semantic: "base_excludes_cache",
      reported_input_tokens: 15788, cache_read_input_tokens: 1152, cache_creation_input_tokens: 0,
      reported_output_tokens: 108, reasoning_output_tokens: 84, reported_total_tokens: 15788 + 1152 + 108,
      cache_state: "positive", model_provider: "GROK", model_identifier: "grok-4.7", runtime_kind: "grok_build",
    }) });
  });

  it("reports MCP server readiness and unavailability", () => {
    expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/mcp/server_status",
      { sessionId: "s-1", name: "autobyteus_agent_tools", status: "ready", reason: "initialized" }, context))
      .toEqual([{ kind: "mcp_status", server: "autobyteus_agent_tools", status: "ready", detail: "initialized" }]);
    expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/mcp/server_status",
      { sessionId: "s-1", name: "autobyteus_agent_tools", status: "unavailable", reason: "handshake_failed" }, context)[0])
      .toMatchObject({ status: "unavailable" });
  });

  it("ignores unknown or malformed extension traffic (QR-005)", () => {
    expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/brand_new", { anything: 1 }, context)).toEqual([]);
    expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/session_notification",
      { update: { sessionUpdate: "response_completed", usage: { input_tokens: "x" } } }, context)).toEqual([]);
    expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/session_notification",
      { update: { sessionUpdate: "response_completed", usage: { input_tokens: 1, output_tokens: 1 } } }, { ...context, turnId: null })).toEqual([]);
  });
});
