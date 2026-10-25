import test from "node:test";
import assert from "node:assert/strict";
import {
  CollaborationStreamClientMessageSchema,
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
} from "../dist/index.js";

const remoteTeam = {
  kind: "agent_team", address: "/marketing_team", team_run_id: "marketing-team-run", node_id: "srv_docker", node_name: "docker",
  coordinator_address: "/marketing_team/campaign_lead", members: [{ address: "/marketing_team/campaign_lead", agent_run_id: "lead-run" }],
  delegator_agent_run_id: "host-run", started_at: "2026-10-23T08:01:00.000Z",
};

const agentView = (remote) => ({
  root_subject_kind: "agent", root_run_id: "host-run",
  root_agent: {
    base_change_sequence: 0, is_active: true,
    execution_tree: { subjectKind: "agent", createdAt: "2026-10-23T08:00:00.000Z",
      host: { address: "/project_task_manager", agentRunId: "host-run", agentDefinitionId: "ptm-def" }, taskExecutions: [] },
    closed_task_executions: [],
    communication_messages: { schemaVersion: 1, subjectKind: "agent", hostRunId: "host-run", messages: [] },
    agent_statuses: [], agent_input_states: [],
    ...(remote === undefined ? {} : { remote_task_executions: remote }),
  },
});

test("an Agent root view lists its remote runs beside its tree; the list is required", () => {
  assert.deepEqual(RootExecutionViewDtoSchema.parse(agentView([remoteTeam])).root_agent.remote_task_executions, [remoteTeam]);
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView(undefined)));
});

test("Agent and Org root events carry a remote run's start and its node's summary", () => {
  for (const root_subject_kind of ["agent", "agent_org"]) {
    const started = { root_subject_kind, root_run_id: "root-run", change_sequence: 4,
      event: { kind: "remote_task_execution_started", execution: remoteTeam } };
    assert.deepEqual(RootExecutionEventDtoSchema.parse(started), started);
    const summary = { root_subject_kind, root_run_id: "root-run", change_sequence: 5,
      event: { kind: "remote_task_execution_summary", node_id: "srv_docker", run_id: "marketing-team-run", reachable: true,
        title: "Plan the October campaign", statuses: [{ agent_run_id: "lead-run", status: "running" }] } };
    assert.deepEqual(RootExecutionEventDtoSchema.parse(summary), summary);
  }
});

test("Retry is a root command without a target", () => {
  const refresh = { type: "REFRESH_REMOTE_TASK_EXECUTIONS", payload: { root_subject_kind: "agent", root_run_id: "host-run" } };
  assert.deepEqual(CollaborationStreamClientMessageSchema.parse(refresh), refresh);
  assert.throws(() => CollaborationStreamClientMessageSchema.parse({ ...refresh, payload: { ...refresh.payload, target_agent_run_id: "x" } }));
});
