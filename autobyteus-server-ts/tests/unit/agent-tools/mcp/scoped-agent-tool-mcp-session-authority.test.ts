import { describe, expect, it, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import type { AgentToolMcpToolAdapter } from "../../../../src/agent-tools/mcp/agent-tool-mcp-adapter.js";
import { AgentToolMcpSessionRegistry } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { createAgentToolMcpSessionAuthorityFactory } from "../../../../src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.js";

const TOOL_NAME = "test_tool";
const publisher = { publishManyForRun: vi.fn().mockResolvedValue([]) };
const adapter: AgentToolMcpToolAdapter = {
  definition: {
    name: TOOL_NAME,
    description: "Test tool",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  isAvailable: () => true,
  execute: vi.fn(async () => ({
    kind: "operation_result" as const,
    result: { accepted: true, message: "ok" },
  })),
};

const activationInput = (runId: string, exposed = true) => ({
  owner: { runId },
  sender: buildAgentRunMessageSenderContext({
    senderRunId: runId,
    senderName: runId,
  }),
  runtimeExposure: buildRuntimeAgentToolExposure(exposed ? [TOOL_NAME] : []),
});

const createFixture = () => {
  const registry = new AgentToolMcpSessionRegistry();
  const assertHostOpen = vi.fn();
  return {
    registry,
    assertHostOpen,
    factory: createAgentToolMcpSessionAuthorityFactory({
      registry,
      catalog: new AgentToolMcpCatalog({ adapters: [adapter] }),
      getLocalBaseUrl: () => "http://127.0.0.1:43124",
      assertHostOpen,
    }),
  };
};

describe("ScopedAgentToolMcpSessionAuthority", () => {
  it("enforces assembly state and exposes only deactivation before completion", () => {
    const { factory } = createFixture();
    const assembly = factory.begin({ scopeIdentity: "application:test" });
    expect(assembly.runSessions).not.toHaveProperty("activateForRun");
    const authority = assembly.complete({
      executionCapabilities: {
        publishedArtifactPublisher: publisher,
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    expect(authority.runSessions.activateForRun).toBeTypeOf("function");
    expect(() => assembly.complete({
      executionCapabilities: {
        publishedArtifactPublisher: publisher,
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    })).toThrow("completed");
    authority.close();

    const aborted = factory.begin({ scopeIdentity: "application:aborted" });
    aborted.abort();
    expect(() => aborted.complete({
      executionCapabilities: {
        publishedArtifactPublisher: publisher,
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    })).toThrow("aborted");
  });

  it("reactivates the same deterministic ID after active-only deactivation", () => {
    const { factory, registry } = createFixture();
    const authority = factory.begin({ scopeIdentity: "application:test" }).complete({
      executionCapabilities: {
        publishedArtifactPublisher: publisher,
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    const first = authority.runSessions.activateForRun(activationInput("run-a"));
    if (first.kind !== "active") throw new Error("Expected active result.");
    expect(() => authority.runSessions.activateForRun(activationInput("run-a")))
      .toThrow("already active");
    expect(authority.runSessions.deactivateForRun("run-a")).toBe(1);
    expect(registry.resolveSession(first.sessionId)).toEqual({
      ok: false,
      reason: "missing_session",
    });

    const restored = authority.runSessions.activateForRun(activationInput(" run-a "));
    if (restored.kind !== "active") throw new Error("Expected restored active result.");
    expect(restored.sessionId).toBe(first.sessionId);
    expect(restored.descriptor.serverUrl).toBe(first.descriptor.serverUrl);
  });

  it("does not ledger or register a run with zero exposed tools", () => {
    const { factory, registry } = createFixture();
    const authority = factory.begin({ scopeIdentity: "application:test" }).complete({
      executionCapabilities: {
        publishedArtifactPublisher: publisher,
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    expect(authority.runSessions.activateForRun(activationInput("hidden", false)))
      .toEqual({ kind: "not_exposed" });
    expect(authority.runSessions.deactivateForRun("hidden")).toBe(0);
    expect(registry.listSessions()).toEqual([]);
  });

  it("compensates an activated record when ledger admission fails", () => {
    const { factory, registry } = createFixture();
    const authority = factory.begin({ scopeIdentity: "application:test" }).complete({
      executionCapabilities: {
        publishedArtifactPublisher: publisher,
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    const originalActivate = registry.activateSession.bind(registry);
    let sessionId = "";
    vi.spyOn(registry, "activateSession").mockImplementationOnce((input) => {
      const session = originalActivate(input);
      sessionId = session.sessionId;
      authority.blockNewSessions();
      return session;
    });
    expect(() => authority.runSessions.activateForRun(activationInput("run-new")))
      .toThrow("is closing");
    expect(registry.resolveSession(sessionId)).toEqual({
      ok: false,
      reason: "missing_session",
    });
  });

  it("checks readiness, closes every active record, and is idempotent", () => {
    const { factory, registry } = createFixture();
    let ready = true;
    const authority = factory.begin({ scopeIdentity: "application:test" }).complete({
      executionCapabilities: {
        publishedArtifactPublisher: publisher,
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => {
        if (!ready) throw new Error("publication unavailable");
      },
    });
    const first = authority.runSessions.activateForRun(activationInput("run-a"));
    const second = authority.runSessions.activateForRun(activationInput("run-b"));
    if (first.kind !== "active" || second.kind !== "active") {
      throw new Error("Expected active results.");
    }
    ready = false;
    expect(() => authority.assertReady()).toThrow("publication unavailable");
    ready = true;
    authority.close();
    authority.close();
    expect(registry.resolveSession(first.sessionId).ok).toBe(false);
    expect(registry.resolveSession(second.sessionId).ok).toBe(false);
    expect(() => authority.runSessions.activateForRun(activationInput("late")))
      .toThrow("is closing");
  });
});
