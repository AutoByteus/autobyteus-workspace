import { describe, expect, it, vi } from "vitest";
import { DefaultApplicationAgentToolMcpSessionScope } from "../../../../src/agent-tools/mcp/application-agent-tool-mcp-session-scope.js";
import { ScopedAgentToolMcpSessionManager } from "../../../../src/agent-tools/mcp/scoped-agent-tool-mcp-session-manager.js";

describe("ApplicationAgentToolMcpSessionScope", () => {
  it("revokes only matching ownership and rejects duplicate or post-block recording", () => {
    const revokeAgentToolMcpSession = vi.fn(() => true);
    const scope = new DefaultApplicationAgentToolMcpSessionScope(
      "application:test",
      { revokeAgentToolMcpSession },
    );
    scope.recordIssuedSession("session-a", { runId: "run-a" });
    scope.recordIssuedSession("session-b", { runId: "run-b" });

    expect(() => scope.recordIssuedSession("session-a", { runId: "run-a" }))
      .toThrow("already recorded");
    expect(scope.revokeForRun("run-a")).toBe(1);
    expect(revokeAgentToolMcpSession).toHaveBeenCalledWith("session-a");
    expect(revokeAgentToolMcpSession).not.toHaveBeenCalledWith("session-b");

    scope.blockNewSessions();
    expect(() => scope.recordIssuedSession("session-c", { runId: "run-c" }))
      .toThrow("is closing");
    scope.close();
    scope.close();
    expect(revokeAgentToolMcpSession).toHaveBeenCalledWith("session-b");
    expect(revokeAgentToolMcpSession).toHaveBeenCalledTimes(2);
  });

  it("revokes a newly issued process session when scope recording fails", () => {
    const revokeAgentToolMcpSession = vi.fn(() => true);
    const sessionService = {
      createAgentToolMcpSession: vi.fn(() => ({
        session: { sessionId: "session-new", owner: { runId: "run-new" } },
        descriptor: {},
      })),
      revokeAgentToolMcpSession,
    };
    const scope = {
      recordIssuedSession: vi.fn(() => { throw new Error("scope recording failed"); }),
    };
    const manager = new ScopedAgentToolMcpSessionManager(
      sessionService as never,
      scope as never,
      vi.fn(),
    );

    expect(() => manager.createAgentToolMcpSession({} as never))
      .toThrow("scope recording failed");
    expect(revokeAgentToolMcpSession).toHaveBeenCalledWith("session-new");
  });
});
