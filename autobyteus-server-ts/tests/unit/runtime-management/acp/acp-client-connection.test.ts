import { afterEach, describe, expect, it, vi } from "vitest";
import { AcpClientConnection } from "../../../../src/runtime-management/acp/acp-client-connection.js";
import { fixturePath, readFixture, spawnFakeAgent, waitFor, writeCustomFixture } from "../../agent-execution/backends/acp/acp-fake-agent-harness.js";

const connections: AcpClientConnection[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const connection of connections.splice(0)) await connection.close();
});

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
