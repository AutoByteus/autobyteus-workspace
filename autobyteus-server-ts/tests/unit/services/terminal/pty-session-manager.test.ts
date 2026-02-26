import { describe, expect, it } from "vitest";
import { PtySessionManager, type TerminalSession } from "../../../../src/services/terminal-streaming/index.js";

class MockPtySession implements TerminalSession {
  sessionId: string;
  started = false;
  closed = false;
  cwd: string | null = null;
  writeHistory: Array<Buffer | string> = [];
  resizeHistory: Array<[number, number]> = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  get isAlive(): boolean {
    return this.started && !this.closed;
  }

  async start(cwd: string): Promise<void> {
    this.started = true;
    this.cwd = cwd;
  }

  async write(data: Buffer | string): Promise<void> {
    this.writeHistory.push(data);
  }

  async read(): Promise<Buffer | null> {
    return Buffer.from("mock output", "utf8");
  }

  resize(rows: number, cols: number): void {
    this.resizeHistory.push([rows, cols]);
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

describe("PtySessionManager", () => {
  it("creates session and stores it", async () => {
    const manager = new PtySessionManager(MockPtySession);

    const session = await manager.createSession("s1", "ws1", "/tmp");

    expect(manager.getSession("s1")).toBe(session);
    expect((session as MockPtySession).isAlive).toBe(true);
  });

  it("rejects duplicate session IDs", async () => {
    const manager = new PtySessionManager(MockPtySession);
    await manager.createSession("s1", "ws1", "/tmp");

    await expect(manager.createSession("s1", "ws1", "/tmp")).rejects.toThrow(
      "already exists",
    );
  });

  it("returns null for missing sessions", () => {
    const manager = new PtySessionManager(MockPtySession);

    expect(manager.getSession("missing")).toBeNull();
  });

  it("tracks session count", async () => {
    const manager = new PtySessionManager(MockPtySession);

    expect(manager.sessionCount).toBe(0);

    await manager.createSession("s1", "ws1", "/tmp");
    await manager.createSession("s2", "ws1", "/tmp");

    expect(manager.sessionCount).toBe(2);

    await manager.closeSession("s1");
    expect(manager.sessionCount).toBe(1);
  });

  it("closes sessions", async () => {
    const manager = new PtySessionManager(MockPtySession);
    const session = (await manager.createSession("s1", "ws1", "/tmp")) as MockPtySession;

    const result = await manager.closeSession("s1");

    expect(result).toBe(true);
    expect(manager.getSession("s1")).toBeNull();
    expect(session.closed).toBe(true);
  });

  it("returns false when closing unknown session", async () => {
    const manager = new PtySessionManager(MockPtySession);

    const result = await manager.closeSession("missing");

    expect(result).toBe(false);
  });

  it("closes sessions by workspace", async () => {
    const manager = new PtySessionManager(MockPtySession);

    await manager.createSession("s1", "ws1", "/tmp");
    await manager.createSession("s2", "ws1", "/tmp");
    await manager.createSession("s3", "ws2", "/tmp");

    const closed = await manager.closeAllForWorkspace("ws1");

    expect(closed).toBe(2);
    expect(manager.getSession("s1")).toBeNull();
    expect(manager.getSession("s2")).toBeNull();
    expect(manager.getSession("s3")).not.toBeNull();
  });

  it("closes all sessions", async () => {
    const manager = new PtySessionManager(MockPtySession);

    await manager.createSession("s1", "ws1", "/tmp");
    await manager.createSession("s2", "ws2", "/tmp");

    const closed = await manager.closeAll();

    expect(closed).toBe(2);
    expect(manager.sessionCount).toBe(0);
  });

  it("lists sessions", async () => {
    const manager = new PtySessionManager(MockPtySession);

    await manager.createSession("s1", "ws1", "/tmp");
    await manager.createSession("s2", "ws2", "/tmp");

    expect(manager.listSessions()).toEqual({ s1: "ws1", s2: "ws2" });
  });
});
