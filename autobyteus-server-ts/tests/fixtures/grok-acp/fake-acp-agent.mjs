#!/usr/bin/env node
// Replays a recorded ACP fixture as a fake agent over stdio for unit tests.
// Script rows (`tests/fixtures/grok-acp/*.jsonl`): `{"dir":"in"|"out","msg":{...}}`.
//   `out` request/notification: wait until the client sends that method (ids are mapped).
//   `out` response: wait until the client answers the agent request with that id.
//   `in` message: send it; responses carry the client's actual request id.
// Env: FAKE_ACP_FIXTURE (required), FAKE_ACP_EXIT_AT_END=1 exits after the script ends,
// FAKE_ACP_STOP_BEFORE=<method> exits before replaying that client method,
// FAKE_ACP_RECORD=<file> appends every client message as one JSON line,
// FAKE_ACP_REPORT_MCP_READY=1 answers each MCP server the client configures in session/new or
// session/load with a `_x.ai/mcp/server_status` "ready" notification, as the real Grok CLI does
// once it has connected (recordings made without MCP servers carry none).
import fs from "node:fs";
import readline from "node:readline";

const rows = fs.readFileSync(process.env.FAKE_ACP_FIXTURE, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const idMap = new Map();
const received = [];
let waiter = null;

const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);

readline.createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  if (process.env.FAKE_ACP_RECORD) fs.appendFileSync(process.env.FAKE_ACP_RECORD, `${line}\n`);
  received.push(JSON.parse(line));
  waiter?.();
});

const take = (predicate) => new Promise((resolve) => {
  const check = () => {
    const index = received.findIndex(predicate);
    if (index < 0) return;
    waiter = null;
    resolve(received.splice(index, 1)[0]);
  };
  waiter = check;
  check();
});

const tick = () => new Promise((resolve) => setImmediate(resolve));
const SESSION_OPENING_METHODS = new Set(["session/new", "session/load"]);
const pendingMcpReady = new Map();

for (const { dir, msg } of rows) {
  if (dir === "out") {
    if ("method" in msg) {
      if (process.env.FAKE_ACP_STOP_BEFORE === msg.method) process.exit(3);
      const actual = await take((candidate) => candidate.method === msg.method);
      if ("id" in msg) idMap.set(msg.id, actual.id);
      if (process.env.FAKE_ACP_REPORT_MCP_READY === "1" && SESSION_OPENING_METHODS.has(msg.method) && "id" in msg) {
        pendingMcpReady.set(msg.id, { servers: actual.params?.mcpServers ?? [], sessionId: actual.params?.sessionId ?? null });
      }
    } else {
      await take((candidate) => !("method" in candidate) && candidate.id === msg.id);
    }
    continue;
  }
  const outgoing = !("method" in msg) && idMap.has(msg.id) ? { ...msg, id: idMap.get(msg.id) } : msg;
  send(outgoing);
  const ready = !("method" in msg) ? pendingMcpReady.get(msg.id) : undefined;
  if (ready) {
    pendingMcpReady.delete(msg.id);
    const sessionId = msg.result?.sessionId ?? ready.sessionId;
    for (const server of ready.servers) {
      send({ jsonrpc: "2.0", method: "_x.ai/mcp/server_status",
        params: { sessionId, name: server.name, source: "local", status: "ready", reason: "initialized", tools: null } });
    }
  }
  await tick();
}

if (process.env.FAKE_ACP_EXIT_AT_END === "1") process.exit(0);
process.stdin.on("end", () => process.exit(0));
