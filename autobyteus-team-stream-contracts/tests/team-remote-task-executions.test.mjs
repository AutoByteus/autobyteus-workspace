import test from "node:test";
import assert from "node:assert/strict";
import { parseTeamStreamClientMessage, parseTeamStreamServerMessage } from "../dist/index.js";

test("a Team stream carries a remote run's node's summary, sequenced (its start is a child row change, SR-042)", () => {
  const summary = { type: "REMOTE_TASK_EXECUTION_SUMMARY", payload: { change_sequence: 4, node_id: "srv_docker",
    run_id: "researcher-run", reachable: false, title: null, statuses: [] } };
  assert.deepEqual(parseTeamStreamServerMessage(summary), summary);
  assert.throws(() => parseTeamStreamServerMessage({ ...summary, payload: { ...summary.payload, change_sequence: undefined } }));
});

test("Retry is a Team client command without a payload", () => {
  const refresh = { type: "REFRESH_REMOTE_TASK_EXECUTIONS", payload: {} };
  assert.deepEqual(parseTeamStreamClientMessage(refresh), refresh);
  assert.throws(() => parseTeamStreamClientMessage({ type: "REFRESH_REMOTE_TASK_EXECUTIONS", payload: { agent_run_id: "x" } }));
});
