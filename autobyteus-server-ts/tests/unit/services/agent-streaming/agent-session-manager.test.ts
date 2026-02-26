import { describe, expect, it } from "vitest";
import { AgentSessionManager } from "../../../../src/services/agent-streaming/agent-session-manager.js";

class MockAgentSession {
  private connected = false;
  private closed = false;
  readonly sessionId: string;
  readonly agentId: string;

  constructor(sessionId: string, agentId: string) {
    this.sessionId = sessionId;
    this.agentId = agentId;
  }

  get isConnected(): boolean {
    return this.connected && !this.closed;
  }

  connect(): void {
    this.connected = true;
  }

  close(): void {
    this.closed = true;
  }
}

describe("AgentSessionManager", () => {
  it("creates sessions successfully", () => {
    const manager = new AgentSessionManager(MockAgentSession as any);

    const session = manager.createSession("s1", "agent-123");

    expect(session.sessionId).toBe("s1");
    expect(session.agentId).toBe("agent-123");
    expect(manager.sessionCount).toBe(1);
  });

  it("throws when creating a duplicate session", () => {
    const manager = new AgentSessionManager(MockAgentSession as any);
    manager.createSession("s1", "agent-123");

    expect(() => manager.createSession("s1", "agent-456")).toThrow("already exists");
  });

  it("allows multiple sessions for the same agent", () => {
    const manager = new AgentSessionManager(MockAgentSession as any);

    const s1 = manager.createSession("s1", "agent-123");
    const s2 = manager.createSession("s2", "agent-123");

    expect(s1.sessionId).not.toBe(s2.sessionId);
    expect(s1.agentId).toBe(s2.agentId);
    expect(manager.sessionCount).toBe(2);
  });

  it("retrieves sessions by ID", () => {
    const manager = new AgentSessionManager(MockAgentSession as any);
    const created = manager.createSession("s1", "agent-123");

    expect(manager.getSession("s1")).toBe(created);
    expect(manager.getSession("missing")).toBeUndefined();
  });

  it("retrieves sessions for an agent", () => {
    const manager = new AgentSessionManager(MockAgentSession as any);
    manager.createSession("s1", "agent-1");
    manager.createSession("s2", "agent-1");
    manager.createSession("s3", "agent-2");

    const sessions = manager.getSessionsForAgent("agent-1");

    expect(sessions).toHaveLength(2);
    expect(sessions.every((session) => session.agentId === "agent-1")).toBe(true);
  });

  it("closes sessions and removes them", () => {
    const manager = new AgentSessionManager(MockAgentSession as any);
    const session = manager.createSession("s1", "agent-123");

    const result = manager.closeSession("s1");

    expect(result).toBe(true);
    expect(manager.getSession("s1")).toBeUndefined();
    expect(manager.sessionCount).toBe(0);
    expect((session as MockAgentSession).isConnected).toBe(false);
  });

  it("returns false when closing unknown sessions", () => {
    const manager = new AgentSessionManager(MockAgentSession as any);

    expect(manager.closeSession("unknown")).toBe(false);
  });

  it("closes all sessions for an agent", () => {
    const manager = new AgentSessionManager(MockAgentSession as any);
    manager.createSession("s1", "agent-1");
    manager.createSession("s2", "agent-1");
    manager.createSession("s3", "agent-2");

    const count = manager.closeAllForAgent("agent-1");

    expect(count).toBe(2);
    expect(manager.sessionCount).toBe(1);
    expect(manager.getSession("s3")).toBeDefined();
  });

  it("closes all sessions", () => {
    const manager = new AgentSessionManager(MockAgentSession as any);
    manager.createSession("s1", "agent-1");
    manager.createSession("s2", "agent-2");

    const count = manager.closeAll();

    expect(count).toBe(2);
    expect(manager.sessionCount).toBe(0);
  });

  it("lists active sessions", () => {
    const manager = new AgentSessionManager(MockAgentSession as any);
    manager.createSession("s1", "agent-1");
    manager.createSession("s2", "agent-2");

    expect(manager.listSessions()).toEqual({ s1: "agent-1", s2: "agent-2" });
  });

  it("lists empty sessions when none exist", () => {
    const manager = new AgentSessionManager(MockAgentSession as any);

    expect(manager.listSessions()).toEqual({});
  });
});
