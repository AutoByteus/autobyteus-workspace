import { describe, expect, it, beforeEach } from "vitest";
import {
  TerminalHandler,
  PtySessionManager,
  type TerminalSession,
} from "../../../../src/services/terminal-streaming/index.js";

class MockPtySession implements TerminalSession {
  sessionId: string;
  started = false;
  closed = false;
  writtenData: Buffer[] = [];
  resizeCalls: Array<[number, number]> = [];
  readData: Buffer | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  get isAlive(): boolean {
    return this.started && !this.closed;
  }

  async start(_cwd: string): Promise<void> {
    this.started = true;
  }

  async write(data: Buffer | string): Promise<void> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
    this.writtenData.push(buffer);
  }

  async read(): Promise<Buffer | null> {
    return this.readData;
  }

  resize(rows: number, cols: number): void {
    this.resizeCalls.push([rows, cols]);
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

const createHandler = () => {
  const manager = new PtySessionManager(MockPtySession);
  const handler = new TerminalHandler(manager);
  return { manager, handler };
};

describe("TerminalHandler parsing", () => {
  it("parses input message", () => {
    const raw = JSON.stringify({ type: "input", data: "bHM=" });

    const result = TerminalHandler.parseMessage(raw);

    expect(result.type).toBe("input");
    expect((result as { data: string }).data).toBe("bHM=");
  });

  it("parses resize message", () => {
    const raw = JSON.stringify({ type: "resize", rows: 24, cols: 80 });

    const result = TerminalHandler.parseMessage(raw);

    expect(result.type).toBe("resize");
    expect((result as { rows?: number }).rows).toBe(24);
    expect((result as { cols?: number }).cols).toBe(80);
  });

  it("rejects invalid JSON", () => {
    expect(() => TerminalHandler.parseMessage("not json")).toThrow("Invalid JSON");
  });

  it("rejects messages without type", () => {
    expect(() => TerminalHandler.parseMessage(JSON.stringify({ data: "test" }))).toThrow(
      "Message missing 'type'",
    );
  });

  it("encodes output", () => {
    const result = TerminalHandler.encodeOutput(Buffer.from("hello", "utf8"));
    const parsed = JSON.parse(result) as { type: string; data: string };

    expect(parsed.type).toBe("output");
    expect(Buffer.from(parsed.data, "base64").toString("utf8")).toBe("hello");
  });
});

describe("TerminalHandler messaging", () => {
  let manager: PtySessionManager;
  let handler: TerminalHandler;

  beforeEach(() => {
    ({ manager, handler } = createHandler());
  });

  it("writes input to session", async () => {
    const session = (await manager.createSession("s1", "ws1", "/tmp")) as MockPtySession;
    const payload = Buffer.from("ls -la", "utf8").toString("base64");
    const message = JSON.stringify({ type: "input", data: payload });

    await handler.handleMessage("s1", message);

    expect(session.writtenData[0]?.toString("utf8")).toBe("ls -la");
  });

  it("resizes session", async () => {
    const session = (await manager.createSession("s1", "ws1", "/tmp")) as MockPtySession;
    const message = JSON.stringify({ type: "resize", rows: 50, cols: 120 });

    await handler.handleMessage("s1", message);

    expect(session.resizeCalls).toEqual([[50, 120]]);
  });

  it("ignores messages for unknown session", async () => {
    await expect(handler.handleMessage("missing", "{\"type\":\"input\",\"data\":\"dGVzdA==\"}"))
      .resolves.toBeUndefined();
  });

  it("connects and disconnects", async () => {
    const connection = {
      send: () => undefined,
      close: () => undefined,
    };

    const sessionId = await handler.connect(connection, "ws1", "s1", "/tmp");
    expect(sessionId).toBe("s1");
    expect(manager.getSession("s1")).not.toBeNull();

    await handler.disconnect("s1");
    expect(manager.getSession("s1")).toBeNull();
  });
});
