import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRunStatusClientMessage, parseRunStatusServerMessage, serializeRunStatusMessage } from "../dist/index.js";

test("run-status: a client subscribes and unsubscribes by run (kind and ID)", () => {
  const message = { type: "SUBSCRIBE", payload: { runs: [{ kind: "agent", runId: "a" }, { kind: "agent_team", runId: "t" }] } };
  assert.deepEqual(parseRunStatusClientMessage(serializeRunStatusMessage(message)), message);
  assert.throws(() => parseRunStatusClientMessage(JSON.stringify({ type: "SUBSCRIBE", payload: { runs: [{ kind: "agent", runId: "" }] } })));
  assert.throws(() => parseRunStatusClientMessage(JSON.stringify({ type: "SUBSCRIBE", payload: { ids: ["a"] } })));
});

test("run-status: the server's snapshot, change and tree notice", () => {
  const snapshot = { type: "RUN_STATUS_SNAPSHOT", payload: { runs: [{ kind: "agent_team", runId: "t", answer: "ok", node: null, status: "idle", agents: [{ agentRunId: "m", status: "idle" }] }] } };
  assert.deepEqual(parseRunStatusServerMessage(snapshot), snapshot);
  const changed = { type: "RUN_STATUS_CHANGED", payload: { kind: "agent", runId: "a", agentRunId: "a", status: "running" } };
  assert.deepEqual(parseRunStatusServerMessage(changed), changed);
  assert.deepEqual(parseRunStatusServerMessage({ type: "RUN_TREE_CHANGED", payload: { kind: "agent_org", runId: "o" } }).type, "RUN_TREE_CHANGED");
  assert.throws(() => parseRunStatusServerMessage({ type: "RUN_STATUS_CHANGED", payload: { kind: "agent", runId: "a", agentRunId: "a", status: "busy" } }));
});

test("run-status (SR-086 G-A2 … G-A4): a run's own state: its status, not_found, or unreachable with its node", () => {
  const unknown = { type: "RUN_STATUS_SNAPSHOT", payload: { runs: [{ kind: "agent", runId: "gone", answer: "not_found", node: null, status: null, agents: [] }] } };
  assert.deepEqual(parseRunStatusServerMessage(unknown), unknown);
  const unreachable = { type: "RUN_STATE_CHANGED", payload: { kind: "agent_team", runId: "studio", answer: "unreachable", node: "beta-node", status: null } };
  assert.deepEqual(parseRunStatusServerMessage(unreachable), unreachable);
  const running = { type: "RUN_STATE_CHANGED", payload: { kind: "agent_org", runId: "o", answer: "ok", node: null, status: "running" } };
  assert.deepEqual(parseRunStatusServerMessage(running), running);
  assert.throws(() => parseRunStatusServerMessage({ type: "RUN_STATE_CHANGED", payload: { kind: "agent", runId: "a", answer: "maybe", node: null, status: null } }));
});
