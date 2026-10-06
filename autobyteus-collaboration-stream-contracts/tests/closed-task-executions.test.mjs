import test from "node:test";
import assert from "node:assert/strict";
import { RootExecutionEventDtoSchema, RootExecutionViewDtoSchema } from "../dist/index.js";

const launch = { runtimeKind: "autobyteus", llmModelIdentifier: "model", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null };
const at = "2026-10-06T00:00:00.000Z";
const taskAgent = (address, agentRunId) => ({ address, agentRunId, platformAgentRunId: null, delegatorAgentRunId: "host-run", startedAt: at });
const taskTeam = (address, teamRunId, memberRunId, taskExecutions = []) => ({
  address, teamRunId, startedAt: at, delegatorAgentRunId: "host-run",
  members: [{ address: `${address}/lead`, agentRunId: memberRunId, platformAgentRunId: null }], taskExecutions,
});

const agentView = (closed) => ({
  root_subject_kind: "agent", root_run_id: "host-run",
  root_agent: {
    base_change_sequence: 0, is_active: false,
    execution_tree: {
      subjectKind: "agent", createdAt: at,
      host: { address: "/manager", agentRunId: "host-run", agentDefinitionId: "manager" },
      collaborators: [],
      taskExecutions: [taskAgent("/writer", "writer-run"), taskTeam("/review", "review-team", "review-lead", [taskAgent("/helper", "helper-run")])],
    },
    closed_task_executions: closed,
    communication_messages: { schemaVersion: 1, subjectKind: "agent", hostRunId: "host-run", messages: [{
      messageId: "m1", senderAgentRunId: "writer-run", receiverAgentRunId: "host-run", content: "done",
      messageType: "agent_message", referenceFiles: [], createdAt: at,
    }] },
    agent_statuses: [], agent_input_states: [],
  },
});

const orgView = (closed) => ({
  root_subject_kind: "agent_org", root_run_id: "org-run",
  root_org: {
    base_change_sequence: 0, is_active: false,
    execution_tree: { subjectKind: "agent_org", createdAt: at, archivedAt: null, applicationBinding: null, handoffs: [], rootOrg: {
      address: "/", orgDefinitionId: "org", orgDefinitionName: "Org", orgRunId: "org-run", defaultLaunchConfiguration: launch,
      members: [
        { address: "/manager", agentDefinitionId: "manager", role: null, description: null, agentRunId: "manager-run", platformAgentRunId: null, launchConfiguration: launch },
        { address: "/team", teamDefinitionId: "team", role: null, description: null, teamRunId: "team-run", coordinatorAddress: "/team/lead",
          defaultLaunchConfiguration: launch,
          members: [{ address: "/team/lead", agentDefinitionId: "lead", role: null, description: null, agentRunId: "lead-run", platformAgentRunId: null, launchConfiguration: launch }],
          taskExecutions: [taskAgent("/team/worker", "team-worker-run")] },
      ],
      collaborators: [],
      taskExecutions: [taskAgent("/writer", "writer-run")],
    } },
    closed_task_executions: closed,
    communication_messages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-run", messages: [] },
    agent_statuses: [], agent_input_states: [],
  },
});

test("Agent root views require closed task executions and keep closed nodes and their messages in the tree", () => {
  const parsed = RootExecutionViewDtoSchema.parse(agentView([{ agentRunId: "writer-run" }, { teamRunId: "review-team" }, { agentRunId: "helper-run" }]));
  assert.deepEqual(parsed.root_agent.closed_task_executions, [{ agentRunId: "writer-run" }, { teamRunId: "review-team" }, { agentRunId: "helper-run" }]);
  assert.equal(parsed.root_agent.communication_messages.messages[0].senderAgentRunId, "writer-run");
  const missing = agentView([]);
  delete missing.root_agent.closed_task_executions;
  assert.throws(() => RootExecutionViewDtoSchema.parse(missing));
});

test("a closed reference must identify a task execution node of the tree", () => {
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView([{ agentRunId: "unknown-run" }])), /closed task execution 'agent:unknown-run'/);
  // A Team member and the host are not task executions.
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView([{ agentRunId: "review-lead" }])), /not a task execution/);
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView([{ agentRunId: "host-run" }])), /not a task execution/);
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView([{ teamRunId: "writer-run" }])), /not a task execution/);
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView([{ agentRunId: "writer-run", teamRunId: "review-team" }])));
});

test("AgentOrg views correlate closed references with root and configured-Team task executions", () => {
  const parsed = RootExecutionViewDtoSchema.parse(orgView([{ agentRunId: "writer-run" }, { agentRunId: "team-worker-run" }]));
  assert.equal(parsed.root_org.closed_task_executions.length, 2);
  assert.throws(() => RootExecutionViewDtoSchema.parse(orgView([{ teamRunId: "team-run" }])), /AgentOrg closed task execution 'team:team-run'/);
  assert.throws(() => RootExecutionViewDtoSchema.parse(orgView([{ agentRunId: "manager-run" }])), /not a task execution/);
  const missing = orgView([]);
  delete missing.root_org.closed_task_executions;
  assert.throws(() => RootExecutionViewDtoSchema.parse(missing));
});

test("task_executions_closed is a strict, non-empty sequenced event for Agent and Org roots", () => {
  for (const [root_subject_kind, root_run_id] of [["agent", "host-run"], ["agent_org", "org-run"]]) {
    const event = { kind: "task_executions_closed", task_executions: [{ agentRunId: "writer-run" }, { teamRunId: "review-team" }] };
    assert.deepEqual(RootExecutionEventDtoSchema.parse({ root_subject_kind, root_run_id, change_sequence: 7, event }).event, event);
    assert.throws(() => RootExecutionEventDtoSchema.parse({ root_subject_kind, root_run_id, change_sequence: 7, event: { ...event, task_executions: [] } }));
    assert.throws(() => RootExecutionEventDtoSchema.parse({ root_subject_kind, root_run_id, change_sequence: 7, event: { ...event, extra: true } }));
  }
});
