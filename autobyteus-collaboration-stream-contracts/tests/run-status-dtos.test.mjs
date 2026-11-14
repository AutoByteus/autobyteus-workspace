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
  const snapshot = { type: "RUN_STATUS_SNAPSHOT", payload: { runs: [{ kind: "agent_team", runId: "t", agents: [{ agentRunId: "m", status: "idle" }] }] } };
  assert.deepEqual(parseRunStatusServerMessage(snapshot), snapshot);
  const changed = { type: "RUN_STATUS_CHANGED", payload: { kind: "agent", runId: "a", agentRunId: "a", status: "running" } };
  assert.deepEqual(parseRunStatusServerMessage(changed), changed);
  assert.deepEqual(parseRunStatusServerMessage({ type: "RUN_TREE_CHANGED", payload: { kind: "agent_org", runId: "o" } }).type, "RUN_TREE_CHANGED");
  assert.throws(() => parseRunStatusServerMessage({ type: "RUN_STATUS_CHANGED", payload: { kind: "agent", runId: "a", agentRunId: "a", status: "busy" } }));
});
