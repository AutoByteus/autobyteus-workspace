import test from "node:test";
import assert from "node:assert/strict";
import { parseTeamStreamClientMessage, parseTeamStreamServerMessage } from "../dist/index.js";

const remoteAgent = {
  kind: "agent", address: "/market_researcher", agent_run_id: "researcher-run", node_id: "srv_docker", node_name: "docker",
  delegator_agent_run_id: "coordinator-run", started_at: "2026-10-23T08:00:00.000Z",
};

test("a Team stream carries a remote run's start and its node's summary, sequenced", () => {
  const started = { type: "REMOTE_TASK_EXECUTION_STARTED", payload: { change_sequence: 3, execution: remoteAgent } };
  assert.deepEqual(parseTeamStreamServerMessage(started), started);
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
