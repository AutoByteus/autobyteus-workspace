import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { AcpClientConnection } from "../../../../src/runtime-management/acp/acp-client-connection.js";
import type { RequestPermissionRequest, SessionNotification } from "@agentclientprotocol/sdk";
import {
  fixturePath,
  fixtureSessionId,
  readFixture,
  removeTestTempDirs,
  spawnFakeAgent,
  waitFor,
  writeCustomFixture,
  type FixtureRow,
} from "../../agent-execution/backends/acp/acp-fake-agent-harness.js";

const connections: AcpClientConnection[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const connection of connections.splice(0)) await connection.close();
});

afterAll(removeTestTempDirs);

describe("AcpClientConnection", () => {
  it("initializes against the agent and drops responses to requests it never sent", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rows = readFixture("handshake");
    const connection = new AcpClientConnection(spawnFakeAgent({ fixture: writeCustomFixture([
      ...rows, { dir: "in", msg: { jsonrpc: "2.0", id: "skills-reload", result: { result: { reloaded: 1 } } } },
    ]) }), "Fake Agent");
    connections.push(connection);
    const result = await connection.initialize();
    expect(result.agentCapabilities?.loadSession).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(errors.mock.calls.flat().join(" ")).not.toContain("unknown request");
  });

  it("buffers frames for a session until it registers, then delivers them in order", async () => {
    const connection = new AcpClientConnection(spawnFakeAgent({ fixture: fixturePath("handshake") }), "Fake Agent");
    connections.push(connection);
    await connection.initialize();
    const { sessionId } = await connection.newSession({ cwd: "/tmp", mcpServers: [] });
    const seen: string[] = [];
    connection.registerSession(sessionId, {
      onSessionUpdate: (notification) => { seen.push(`update:${notification.update.sessionUpdate}`); },
      onPermissionRequest: async () => ({ outcome: { outcome: "cancelled" } }),
      onExtNotification: (method) => { seen.push(`ext:${method}`); },
    });
    await waitFor(() => seen.length > 0);
    expect(seen.some((entry) => entry.startsWith("ext:_x.ai/session/setup"))).toBe(true);
  });

  it("reports closure when the agent process exits", async () => {
    const connection = new AcpClientConnection(spawnFakeAgent({ fixture: fixturePath("handshake"), exitAtEnd: true }), "Fake Agent");
    connections.push(connection);
    const closed = new Promise((resolve) => connection.onClose(resolve));
    await connection.initialize().catch(() => undefined);
    await connection.newSession({ cwd: "/tmp", mcpServers: [] }).catch(() => undefined);
    expect(await closed).toMatchObject({ code: expect.stringMatching(/^ACP_(AGENT_PROCESS_EXITED|TRANSPORT_CLOSED)$/) });
    await expect(connection.prompt({ sessionId: "s", prompt: [] })).rejects.toThrow("after close");
  });
});

/**
 * Wire-order delivery (autobyteus-517 SR-004/SR-005, IR-001): the SDK resolves a response at once but awaits notification
 * handlers one by one; the connection's inbound stage hands notifications to the session in wire order before any later
 * frame reaches the SDK. The fake agent writes one frame per write (evidence/IMP-01-sdk-delivery-order.log).
 */
describe("AcpClientConnection wire-order delivery", () => {
  const SID = fixtureSessionId("handshake");
  const ext = (method: string, n: number): FixtureRow => ({ dir: "in", msg: { jsonrpc: "2.0", method, params: { sessionId: SID, n } } });
  const update = (n: number): FixtureRow => ({ dir: "in", msg: { jsonrpc: "2.0", method: "session/update",
    params: { sessionId: SID, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: `u${n}` } } } } });
  const promptRequest: FixtureRow = { dir: "out", msg: { jsonrpc: "2.0", id: 99, method: "session/prompt" } };
  const promptResult: FixtureRow = { dir: "in", msg: { jsonrpc: "2.0", id: 99, result: { stopReason: "end_turn" } } };

  /** Opens a session over the handshake, then sends one prompt; records what reaches the handler and when the prompt resolves. */
  const run = async (rows: FixtureRow[], handler: Partial<{
    onExtNotification: (method: string, params: Record<string, unknown>) => void;
    onPermissionRequest: (request: RequestPermissionRequest) => Promise<{ outcome: { outcome: "selected"; optionId: string } | { outcome: "cancelled" } }>;
  }> = {}) => {
    const connection = new AcpClientConnection(spawnFakeAgent({ fixture: writeCustomFixture([...readFixture("handshake"), promptRequest, ...rows, promptResult]) }), "Fake Agent");
    connections.push(connection);
    await connection.initialize();
    const { sessionId } = await connection.newSession({ cwd: "/tmp", mcpServers: [] });
    const seen: string[] = [];
    connection.registerSession(sessionId, {
      onSessionUpdate: (notification: SessionNotification) => {
        const content = (notification.update as { content?: { text?: string } }).content;
        if (content?.text?.startsWith("u")) seen.push(`update ${content.text}`);
      },
      onPermissionRequest: handler.onPermissionRequest ?? (async () => ({ outcome: { outcome: "cancelled" } })),
      onExtNotification: (method, params) => {
        handler.onExtNotification?.(method, params);
        if (typeof params.n === "number") seen.push(`ext ${method} ${params.n}`);
      },
    });
    await connection.prompt({ sessionId, prompt: [{ type: "text", text: "go" }] }).then(() => seen.push("RESPONSE"));
    return { connection, seen };
  };

  it("delivers notifications in wire order, every one before the response that follows it (IMP-01 order)", async () => {
    const { seen } = await run([update(1), ext("_x.ai/session_notification", 2), ext("_x.ai/queue/changed", 3), update(4)]);
    expect(seen).toEqual(["update u1", "ext _x.ai/session_notification 2", "ext _x.ai/queue/changed 3", "update u4", "RESPONSE"]);
  });

  it("routes a notification without the `_` prefix to the session as an extension notification, method unchanged", async () => {
    const { seen } = await run([ext("custom/notice", 1)]);
    expect(seen).toEqual(["ext custom/notice 1", "RESPONSE"]);
  });

  it("leaves protocol notifications to the SDK", async () => {
    const { seen } = await run([{ dir: "in", msg: { jsonrpc: "2.0", method: "$/cancel_request", params: { sessionId: SID, n: 1, id: 12345 } } }]);
    expect(seen).toEqual(["RESPONSE"]);
  });

  it("drops a malformed session/update with a log and delivers the frames after it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const malformed: FixtureRow = { dir: "in", msg: { jsonrpc: "2.0", method: "session/update", params: { sessionId: SID, update: "chunk" } } };
    const { seen } = await run([malformed, update(2)]);
    expect(seen).toEqual(["update u2", "RESPONSE"]);
    expect(warn.mock.calls.flat().join(" ")).toContain("ACP_FRAME_DROPPED");
  });

  it("contains a handler that throws on one frame: the connection stays open and later frames still arrive", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { connection, seen } = await run([ext("_x.ai/boom", 1), ext("_x.ai/after", 2), update(3)], {
      onExtNotification: (method) => { if (method === "_x.ai/boom") throw new Error("handler failed"); },
    });
    expect(seen).toEqual(["ext _x.ai/after 2", "update u3", "RESPONSE"]);
    expect(connection.closed).toBeNull();
    expect(warn.mock.calls.flat().join(" ")).toMatch(/ACP_FRAME_HANDLER_FAILED: Fake Agent method=_x\.ai\/boom session=\S+: Error: handler failed/);
  });

  it("still answers the agent's permission requests and drops responses to requests it never sent", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const asked: string[] = [];
    const { seen } = await run([
      { dir: "in", msg: { jsonrpc: "2.0", id: "foreign-1", result: {} } },
      { dir: "in", msg: { jsonrpc: "2.0", id: 7, method: "session/request_permission", params: { sessionId: SID,
        toolCall: { toolCallId: "call-1", title: "run_terminal_command", status: "pending" },
        options: [{ optionId: "allow-once", name: "Allow", kind: "allow_once" }] } } },
      { dir: "out", msg: { jsonrpc: "2.0", id: 7, result: { outcome: { outcome: "selected", optionId: "allow-once" } } } },
      update(1),
    ], {
      onPermissionRequest: async (request) => {
        asked.push(request.toolCall.toolCallId);
        return { outcome: { outcome: "selected", optionId: "allow-once" } };
      },
    });
    expect(asked).toEqual(["call-1"]);
    expect(seen).toEqual(["update u1", "RESPONSE"]);
    expect(errors.mock.calls.flat().join(" ")).not.toContain("unknown request");
  });
});
