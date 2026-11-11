import test from "node:test";
import assert from "node:assert/strict";
import { parseTeamStreamServerMessage } from "../dist/index.js";

const launch = { runtime_kind: "autobyteus", llm_model_identifier: "m", llm_config: null, auto_execute_tools: false, workspace_root_path: null };
const snapshot = () => ({
  type: "TEAM_EXECUTION_VIEW_SNAPSHOT",
  payload: {
    root_team_run_id: "team-run", base_change_sequence: 4, live_sequence_id: "live-1", last_message_change_sequence: 0,
    execution_tree: {
      created_at: "t", archived_at: null, application_binding: null, handoffs: [],
      root_team: {
        address: "/", team_definition_id: "se", team_definition_name: "SE", team_run_id: "team-run",
        coordinator_address: "/lead", default_launch_configuration: launch, members: [],
        task_executions: [{ kind: "task_agent", address: "/writer", agent_run_id: "writer-run", platform_agent_run_id: null,
          delegator_agent_run_id: "lead-run", started_at: "t", source: { kind: "agent", agent_definition_id: "writer", launch_configuration: launch } }],
      },
    },
    agent_statuses: [], agent_input_states: [], remote_task_executions: [],
  },
});

const writer = { kind: "task_agent", address: "/writer", agent_run_id: "writer-run", platform_agent_run_id: null,
  delegator_agent_run_id: "lead-run", started_at: "t", source: { kind: "agent", agent_definition_id: "writer", launch_configuration: launch } };
const remoteAgent = { kind: "agent", address: "/far", agent_run_id: "far-run", node_id: "node-b", node_name: "B",
  delegator_agent_run_id: "lead-run", started_at: "t" };

test("the Team snapshot carries no closed set: its child rows are the open ones (autobyteus-461 SR-041)", () => {
  assert.equal(parseTeamStreamServerMessage(snapshot()).payload.execution_tree.root_team.task_executions.length, 1);
  assert.throws(() => parseTeamStreamServerMessage({ ...snapshot(), payload: { ...snapshot().payload, closed_task_executions: [] } }));
});

test("CHILD_RUNS_CHANGED is unsequenced: local rows with their parent Team run, peer rows, removed runs (SR-043, SR-044)", () => {
  const message = { type: "CHILD_RUNS_CHANGED", payload: { run_id: "team-run",
    added: [{ parent_team_run_id: "team-run", execution: writer }, remoteAgent], removed: [{ agent_run_id: "old-run" }, { team_run_id: "old-team" }] } };
  assert.deepEqual(parseTeamStreamServerMessage(message), message);
  assert.deepEqual(parseTeamStreamServerMessage({ ...message, payload: { run_id: "team-run", added: [], removed: [] } }).payload.added, []);
  assert.throws(() => parseTeamStreamServerMessage({ ...message, payload: { ...message.payload, change_sequence: 9 } }));
  assert.throws(() => parseTeamStreamServerMessage({ ...message, payload: { ...message.payload, added: [{ execution: writer }] } }));
  assert.throws(() => parseTeamStreamServerMessage({ ...message, payload: { ...message.payload, removed: [{ agentRunId: "x" }] } }));
});

test("the hosting messages are gone: started, closed, reopened, a peer run's start, a launch Save", () => {
  for (const message of [
    { type: "TASK_EXECUTION_STARTED", payload: { change_sequence: 3, parent_team_run_id: "team-run", execution: writer } },
    { type: "TASK_EXECUTIONS_CLOSED", payload: { change_sequence: 9, task_executions: [{ agent_run_id: "writer-run" }] } },
    { type: "TASK_EXECUTIONS_REOPENED", payload: { change_sequence: 10, executions: [{ parent_team_run_id: "team-run", execution: writer }] } },
    { type: "REMOTE_TASK_EXECUTION_STARTED", payload: { change_sequence: 3, execution: remoteAgent } },
    { type: "DELEGATED_LAUNCH_SELECTIONS_CHANGED", payload: { change_sequence: 4, selections: [] } },
  ]) assert.throws(() => parseTeamStreamServerMessage(message), undefined, message.type);
});
