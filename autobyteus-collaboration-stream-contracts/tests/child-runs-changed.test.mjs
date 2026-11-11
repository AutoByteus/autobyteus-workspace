import test from "node:test";
import assert from "node:assert/strict";
import { CollaborationStreamServerMessageSchema, RootExecutionEventDtoSchema, RootExecutionViewDtoSchema } from "../dist/index.js";

const launch = { runtimeKind: "autobyteus", llmModelIdentifier: "model", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null };
const at = "2026-10-06T00:00:00.000Z";
const taskAgent = (address, agentRunId) => ({ address, agentRunId, platformAgentRunId: null, delegatorAgentRunId: "host-run", startedAt: at,
  source: { kind: "agent", agentDefinitionId: "agent", launchConfiguration: launch } });
const taskTeam = (address, teamRunId, memberRunId, taskExecutions = []) => ({
  address, teamRunId, startedAt: at, delegatorAgentRunId: "host-run",
  members: [{ address: `${address}/lead`, agentRunId: memberRunId, platformAgentRunId: null }], taskExecutions,
  source: { kind: "agent_team", teamDefinitionId: "team", coordinatorAddress: `${address}/lead`, handoffs: [], defaultLaunchConfiguration: launch,
    members: [{ address: `${address}/lead`, agentDefinitionId: "lead", launchConfiguration: launch, followsTeam: true }] },
});

const agentView = () => ({
  root_subject_kind: "agent", root_run_id: "host-run",
  root_agent: {
    base_change_sequence: 0, live_sequence_id: null, last_message_change_sequence: null, is_active: false,
    execution_tree: {
      subjectKind: "agent", createdAt: at,
      host: { address: "/manager", agentRunId: "host-run", agentDefinitionId: "manager" },
      taskExecutions: [taskAgent("/writer", "writer-run"), taskTeam("/review", "review-team", "review-lead", [taskAgent("/helper", "helper-run")])],
    },
    agent_statuses: [], agent_input_states: [], remote_task_executions: [],
  },
});

const orgView = () => ({
  root_subject_kind: "agent_org", root_run_id: "org-run",
  root_org: {
    base_change_sequence: 0, live_sequence_id: null, last_message_change_sequence: null, is_active: false,
    execution_tree: { subjectKind: "agent_org", createdAt: at, archivedAt: null, applicationBinding: null, handoffs: [], rootOrg: {
      address: "/", orgDefinitionId: "org", orgDefinitionName: "Org", orgRunId: "org-run", defaultLaunchConfiguration: launch,
      members: [
        { address: "/manager", agentDefinitionId: "manager", role: null, description: null, agentRunId: "manager-run", platformAgentRunId: null, launchConfiguration: launch },
        { address: "/team", teamDefinitionId: "team", role: null, description: null, teamRunId: "team-run", coordinatorAddress: "/team/lead",
          defaultLaunchConfiguration: launch,
          members: [{ address: "/team/lead", agentDefinitionId: "lead", role: null, description: null, agentRunId: "lead-run", platformAgentRunId: null, launchConfiguration: launch }],
          taskExecutions: [taskAgent("/team/worker", "team-worker-run")] },
      ],
      taskExecutions: [taskAgent("/writer", "writer-run")],
    } },
    agent_statuses: [], agent_input_states: [], remote_task_executions: [],
  },
});

const remoteAgent = { kind: "agent", address: "/far", agent_run_id: "far-run", node_id: "node-b", node_name: "B",
  delegator_agent_run_id: "host-run", started_at: at };
const changed = (root_subject_kind, root_run_id, event) => ({ type: "CHILD_RUNS_CHANGED", payload: { root_subject_kind, root_run_id, event } });

test("views carry no closed set: a child whose Task closed leaves the view (autobyteus-461 SR-041)", () => {
  assert.equal(RootExecutionViewDtoSchema.parse(agentView()).root_agent.execution_tree.taskExecutions.length, 2);
  assert.equal(RootExecutionViewDtoSchema.parse(orgView()).root_org.execution_tree.rootOrg.taskExecutions.length, 1);
  assert.throws(() => RootExecutionViewDtoSchema.parse({ ...agentView(), root_agent: { ...agentView().root_agent, closed_task_executions: [] } }));
  assert.throws(() => RootExecutionViewDtoSchema.parse({ ...orgView(), root_org: { ...orgView().root_org, closed_task_executions: [] } }));
});

test("child_runs_changed is an unsequenced message on the Agent and Org streams, with local and peer rows added and runs removed", () => {
  for (const [kind, runId] of [["agent", "host-run"], ["agent_org", "org-run"]]) {
    const event = { kind: "child_runs_changed", run_id: runId, added: [taskAgent("/writer", "writer-run"), taskTeam("/review", "review-team", "review-lead"), remoteAgent],
      removed: [{ agentRunId: "old-run" }, { teamRunId: "old-team" }] };
    assert.deepEqual(CollaborationStreamServerMessageSchema.parse(changed(kind, runId, event)), changed(kind, runId, event));
    assert.deepEqual(CollaborationStreamServerMessageSchema.parse(changed(kind, runId, { ...event, added: [], removed: [] })).payload.event.added, []);
    assert.throws(() => CollaborationStreamServerMessageSchema.parse(changed(kind, runId, { ...event, extra: true })));
    assert.throws(() => CollaborationStreamServerMessageSchema.parse(changed(kind, runId, { ...event, removed: [{ agent_run_id: "x" }] })));
    assert.throws(() => CollaborationStreamServerMessageSchema.parse({ type: "CHILD_RUNS_CHANGED", payload: { ...changed(kind, runId, event).payload, change_sequence: 4 } }));
    // It is not a sequenced root event.
    assert.throws(() => RootExecutionEventDtoSchema.parse({ root_subject_kind: kind, root_run_id: runId, change_sequence: 4, event }));
  }
  assert.throws(() => CollaborationStreamServerMessageSchema.parse(changed("agent_team", "team-run", { kind: "child_runs_changed", run_id: "team-run", added: [], removed: [] })));
});

test("the hosting events are gone: started, closed, reopened, a peer run's start, a launch Save", () => {
  for (const [kind, runId] of [["agent", "host-run"], ["agent_org", "org-run"]]) {
    for (const event of [
      { kind: "task_execution_started", host_kind: "root", host_run_id: runId, execution: taskAgent("/writer", "writer-run") },
      { kind: "task_executions_closed", task_executions: [{ agentRunId: "writer-run" }] },
      { kind: "task_executions_reopened", task_executions: [{ agentRunId: "writer-run" }] },
      { kind: "remote_task_execution_started", execution: remoteAgent },
      { kind: "delegated_launch_selections_changed", selections: [{ agentRunId: "writer-run", selection: { llmModelIdentifier: "m", llmConfig: null, selectedAt: at } }] },
    ]) assert.throws(() => RootExecutionEventDtoSchema.parse({ root_subject_kind: kind, root_run_id: runId, change_sequence: 4, event }), undefined, event.kind);
  }
});
