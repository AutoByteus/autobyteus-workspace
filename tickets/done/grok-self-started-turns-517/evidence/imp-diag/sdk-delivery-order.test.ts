// IMP-01 diagnostic (autobyteus-517 round 3): the order in which AcpClientConnection hands frames to a session, against
// the wire order. Copy to autobyteus-server-ts/tests/unit/tmp-diag/ and run with vitest; prints one ORDER line.
// Wire order: update u1, ext 2, ext 3, update u4, then the session/prompt response.
import { it } from "vitest";
import os from "node:os";
import { AcpClientConnection } from "../../../src/runtime-management/acp/acp-client-connection.js";
import { readFixture, fixtureSessionId, spawnFakeAgent, writeCustomFixture, type FixtureRow } from "../agent-execution/backends/acp/acp-fake-agent-harness.js";

it("order", async () => {
  const SID = fixtureSessionId("handshake");
  const ext = (method: string, n: number): FixtureRow => ({ dir: "in", msg: { jsonrpc: "2.0", method, params: { sessionId: SID, n } } });
  const upd = (n: number): FixtureRow => ({ dir: "in", msg: { jsonrpc: "2.0", method: "session/update", params: { sessionId: SID, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: `u${n}` } } } } });
  const rows: FixtureRow[] = [...readFixture("handshake"), { dir: "out", msg: { jsonrpc: "2.0", id: 99, method: "session/prompt" } },
    upd(1), ext("_x.ai/session_notification", 2), ext("_x.ai/queue/changed", 3), upd(4), { dir: "in", msg: { jsonrpc: "2.0", id: 99, result: { stopReason: "end_turn" } } }];
  const connection = new AcpClientConnection(spawnFakeAgent({ fixture: writeCustomFixture(rows) }), "Fake");
  const log: string[] = [];
  await connection.initialize();
  const handler = {
    onSessionUpdate: (n: any) => log.push(`update ${n.update.content?.text}`),
    onExtNotification: (_m: string, p: any) => { if (p.n) log.push(`ext ${p.n}`); },
    onPermissionRequest: async () => ({ outcome: { outcome: "cancelled" } }) as any,
  };
  const opened = await connection.newSession({ cwd: os.tmpdir(), mcpServers: [] } as any);
  connection.registerSession(opened.sessionId, handler as any);
  await connection.prompt({ sessionId: opened.sessionId, prompt: [{ type: "text", text: "go" }] }).then(() => log.push("RESPONSE handled"));
  await new Promise((r) => setTimeout(r, 300));
  process.stdout.write(`ORDER: ${log.join(" | ")}\n`);
  await connection.close();
});
