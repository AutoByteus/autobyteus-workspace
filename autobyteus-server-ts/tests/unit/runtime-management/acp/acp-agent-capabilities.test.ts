import { describe, expect, it } from "vitest";
import type { InitializeResponse } from "@agentclientprotocol/sdk";
import { AcpAgentCapabilities, AcpMissingCapabilityError } from "../../../../src/runtime-management/acp/acp-agent-capabilities.js";
import { readFixture } from "../../agent-execution/backends/acp/acp-fake-agent-harness.js";

const grokInitialize = (): InitializeResponse =>
  readFixture("handshake").find((row) => row.dir === "in" && row.msg.result?.agentCapabilities)!.msg.result as InitializeResponse;

/** Shape of an automation-only ACP server: no load, no resume, no MCP, text-only prompts, no auth. */
const automationOnlyInitialize: InitializeResponse = {
  protocolVersion: 1,
  agentCapabilities: { loadSession: false, promptCapabilities: { image: false, audio: false, embeddedContext: false } },
  authMethods: [],
};

/** DeepSeek Harness 0.2.2-rc.1's recorded `initialize` result (RT-001): resume, no load. */
const dshInitialize: InitializeResponse = {
  protocolVersion: 1,
  agentInfo: { name: "deepseek-harness-acp", version: "0.0.1" },
  agentCapabilities: {
    mcpCapabilities: { http: true },
    promptCapabilities: { image: false, audio: false, embeddedContext: false },
    sessionCapabilities: { close: {}, list: {}, resume: {} },
  },
  authMethods: [],
};

describe("AcpAgentCapabilities", () => {
  it("reads standard capabilities of the recorded Grok handshake", () => {
    const capabilities = AcpAgentCapabilities.fromInitialize(grokInitialize());
    expect(capabilities).toMatchObject({ protocolVersion: 1, loadSession: true, imagePrompt: false, mcpHttp: true });
    expect(capabilities.authMethodIds).toEqual(["cached_token", "grok.com"]);
    expect(() => capabilities.require("Agent", AcpAgentCapabilities.requiredFor({ restore: true, mcp: true }))).not.toThrow();
    expect(capabilities.restoreMethod()).toBe("load");
  });

  it("restores an agent that offers only session/resume by resume (AC-004)", () => {
    const capabilities = AcpAgentCapabilities.fromInitialize(dshInitialize);
    expect(capabilities).toMatchObject({ loadSession: false, resumeSession: true, mcpHttp: true });
    expect(capabilities.restoreMethod()).toBe("resume");
    expect(capabilities.missing(AcpAgentCapabilities.requiredFor({ restore: true, mcp: true }))).toEqual([]);
  });

  it("reports every missing capability explicitly for an automation-only agent (AC-016)", () => {
    const capabilities = AcpAgentCapabilities.fromInitialize(automationOnlyInitialize);
    expect(capabilities.restoreMethod()).toBeNull();
    expect(capabilities.missing(AcpAgentCapabilities.requiredFor({ restore: false, mcp: false }))).toEqual([]);
    expect(capabilities.missing(AcpAgentCapabilities.requiredFor({ restore: true, mcp: true })))
      .toEqual(["session/load or session/resume", "HTTP MCP servers"]);
    const error = (() => { try { capabilities.require("Agent", ["restoreSession", "mcpHttp"]); } catch (caught) { return caught; } })();
    expect(error).toBeInstanceOf(AcpMissingCapabilityError);
    expect((error as Error).message)
      .toBe("ACP_AGENT_CAPABILITY_MISSING: Agent does not support session/load or session/resume, HTTP MCP servers.");
  });

  it("rejects an unsupported protocol version", () => {
    expect(AcpAgentCapabilities.fromInitialize({ ...automationOnlyInitialize, protocolVersion: 2 }).missing([])).toEqual(["protocol version 1"]);
  });
});
