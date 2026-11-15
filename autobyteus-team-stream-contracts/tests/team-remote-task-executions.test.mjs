import test from "node:test";
import assert from "node:assert/strict";
import { parseTeamStreamClientMessage, parseTeamStreamServerMessage } from "../dist/index.js";

test("a Team stream carries no remote rows or their summaries: a peer run is a row of the Team's tree (autobyteus-461 SR-084)", () => {
  for (const type of ["REMOTE_TASK_EXECUTION_STARTED", "REMOTE_TASK_EXECUTION_SUMMARY", "TASK_EXECUTION_STARTED", "TASK_EXECUTIONS_CLOSED", "TASK_EXECUTIONS_REOPENED"]) {
    assert.throws(() => parseTeamStreamServerMessage({ type, payload: { change_sequence: 3 } }));
  }
});

test("Retry is a Team client command without a payload", () => {
  const refresh = { type: "REFRESH_REMOTE_TASK_EXECUTIONS", payload: {} };
  assert.deepEqual(parseTeamStreamClientMessage(refresh), refresh);
  assert.throws(() => parseTeamStreamClientMessage({ type: "REFRESH_REMOTE_TASK_EXECUTIONS", payload: { agent_run_id: "x" } }));
});
