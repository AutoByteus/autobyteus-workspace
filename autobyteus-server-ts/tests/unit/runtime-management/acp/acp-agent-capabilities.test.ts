import { describe, expect, it } from "vitest";
import type { InitializeResponse } from "@agentclientprotocol/sdk";
import { AcpAgentCapabilities, AcpMissingCapabilityError } from "../../../../src/runtime-management/acp/acp-agent-capabilities.js";
import { readFixture } from "../../agent-execution/backends/acp/acp-fake-agent-harness.js";

const grokInitialize = (): InitializeResponse =>
  readFixture("handshake").find((row) => row.dir === "in" && row.msg.result?.agentCapabilities)!.msg.result as InitializeResponse;

/** Shape of an automation-only ACP server (DSH): no load, no MCP, text-only prompts, no auth. */
const dshLikeInitialize: InitializeResponse = {
  protocolVersion: 1,
  agentCapabilities: { loadSession: false, promptCapabilities: { image: false, audio: false, embeddedContext: false } },
  authMethods: [],
};

describe("AcpAgentCapabilities", () => {
  it("reads standard capabilities of the recorded Grok handshake", () => {
    const capabilities = AcpAgentCapabilities.fromInitialize(grokInitialize());
    expect(capabilities).toMatchObject({ protocolVersion: 1, loadSession: true, imagePrompt: false, mcpHttp: true });
    expect(capabilities.authMethodIds).toEqual(["cached_token", "grok.com"]);
    expect(() => capabilities.require("Agent", AcpAgentCapabilities.requiredFor({ restore: true, mcp: true }))).not.toThrow();
  });

  it("reports every missing capability explicitly for a DSH-like agent (AC-016)", () => {
    const capabilities = AcpAgentCapabilities.fromInitialize(dshLikeInitialize);
    expect(capabilities.missing(AcpAgentCapabilities.requiredFor({ restore: false, mcp: false }))).toEqual([]);
    expect(capabilities.missing(AcpAgentCapabilities.requiredFor({ restore: true, mcp: true }))).toEqual(["session/load", "HTTP MCP servers"]);
    const error = (() => { try { capabilities.require("DSH", ["loadSession", "mcpHttp"]); } catch (caught) { return caught; } })();
    expect(error).toBeInstanceOf(AcpMissingCapabilityError);
    expect((error as Error).message).toBe("ACP_AGENT_CAPABILITY_MISSING: DSH does not support session/load, HTTP MCP servers.");
  });

  it("rejects an unsupported protocol version", () => {
    expect(AcpAgentCapabilities.fromInitialize({ ...dshLikeInitialize, protocolVersion: 2 }).missing([])).toEqual(["protocol version 1"]);
  });
});
