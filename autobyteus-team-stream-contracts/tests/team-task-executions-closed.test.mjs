import test from "node:test";
import assert from "node:assert/strict";
import { parseTeamStreamServerMessage } from "../dist/index.js";

const launch = { runtime_kind: "autobyteus", llm_model_identifier: "m", llm_config: null, auto_execute_tools: false, workspace_root_path: null };
const snapshot = (closed) => ({
  type: "TEAM_EXECUTION_VIEW_SNAPSHOT",
  payload: {
    root_team_run_id: "team-run", base_change_sequence: 4,
    execution_tree: {
      created_at: "t", archived_at: null, application_binding: null, handoffs: [],
      root_team: {
        address: "/", team_definition_id: "se", team_definition_name: "SE", team_run_id: "team-run",
        coordinator_address: "/lead", default_launch_configuration: launch, members: [], collaborators: [],
        task_executions: [{ kind: "task_agent", address: "/writer", agent_run_id: "writer-run", platform_agent_run_id: null,
          delegator_agent_run_id: "lead-run", started_at: "t" }],
      },
    },
    closed_task_executions: closed,
    messages: [], agent_statuses: [], agent_input_states: [],
  },
});

test("the Team snapshot requires its closed task executions beside the unfiltered tree", () => {
  const parsed = parseTeamStreamServerMessage(snapshot([{ agent_run_id: "writer-run" }, { team_run_id: "review-team" }]));
  assert.deepEqual(parsed.payload.closed_task_executions, [{ agent_run_id: "writer-run" }, { team_run_id: "review-team" }]);
  assert.equal(parsed.payload.execution_tree.root_team.task_executions.length, 1);
  const missing = snapshot([]);
  delete missing.payload.closed_task_executions;
  assert.throws(() => parseTeamStreamServerMessage(missing));
  assert.throws(() => parseTeamStreamServerMessage(snapshot([{ agent_run_id: "a", team_run_id: "b" }])));
});

test("TASK_EXECUTIONS_CLOSED is sequenced, strict and non-empty", () => {
  const message = { type: "TASK_EXECUTIONS_CLOSED", payload: { change_sequence: 9, task_executions: [{ team_run_id: "review-team" }] } };
  assert.deepEqual(parseTeamStreamServerMessage(message), message);
  assert.throws(() => parseTeamStreamServerMessage({ ...message, payload: { ...message.payload, task_executions: [] } }));
  assert.throws(() => parseTeamStreamServerMessage({ ...message, payload: { task_executions: [{ team_run_id: "review-team" }] } }));
  assert.throws(() => parseTeamStreamServerMessage({ ...message, payload: { ...message.payload, task_executions: [{ teamRunId: "review-team" }] } }));
});

test("TASK_EXECUTIONS_REOPENED mirrors the closed event: sequenced, strict and non-empty", () => {
  const message = { type: "TASK_EXECUTIONS_REOPENED", payload: { change_sequence: 10, task_executions: [{ agent_run_id: "writer-run" }] } };
  assert.deepEqual(parseTeamStreamServerMessage(message), message);
  assert.throws(() => parseTeamStreamServerMessage({ ...message, payload: { ...message.payload, task_executions: [] } }));
  assert.throws(() => parseTeamStreamServerMessage({ ...message, payload: { task_executions: [{ agent_run_id: "writer-run" }] } }));
  assert.throws(() => parseTeamStreamServerMessage({ ...message, payload: { ...message.payload, extra: true } }));
});
