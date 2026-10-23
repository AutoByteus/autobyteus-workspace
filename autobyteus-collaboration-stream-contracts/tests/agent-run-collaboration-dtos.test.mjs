import test from "node:test";
import assert from "node:assert/strict";
import {
  CollaborationStreamClientMessageSchema,
  CollaborationStreamServerMessageSchema,
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
  agentOrgExecutionTreeDtoSchema,
} from "../dist/index.js";

const launchConfiguration = {
  runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.6-sol", llmConfig: null,
  autoExecuteTools: false, workspaceRootPath: "/work",
};
const agentSource = { kind: "agent", agentDefinitionId: "reviewer-def", launchConfiguration };
const reviewerRun = {
  address: "/code_reviewer", agentRunId: "reviewer-run", platformAgentRunId: null, delegatorAgentRunId: "host-run",
  startedAt: "2026-09-30T00:00:00.000Z", source: agentSource,
};
const productTeamRun = {
  address: "/product_team", teamRunId: "product-team-run", delegatorAgentRunId: "host-run", startedAt: "2026-09-30T00:00:00.000Z",
  members: [{ address: "/product_team/lead", agentRunId: "lead-run", platformAgentRunId: null }], taskExecutions: [],
  source: { kind: "agent_team", teamDefinitionId: "product-team-def", coordinatorAddress: "/product_team/lead", handoffs: [],
    members: [{ address: "/product_team/lead", agentDefinitionId: "lead-def", launchConfiguration, followsTeam: true }], defaultLaunchConfiguration: launchConfiguration },
};

const agentView = (overrides = {}) => ({
  root_subject_kind: "agent",
  root_run_id: "host-run",
  root_agent: {
    base_change_sequence: 3,
    is_active: true,
    execution_tree: {
      subjectKind: "agent", createdAt: "2026-09-30T00:00:00.000Z",
      host: { address: "/research_assistant", agentRunId: "host-run", agentDefinitionId: "research-def" },
      taskExecutions: [
        reviewerRun, productTeamRun,
        { address: "/code_reviewer", agentRunId: "reviewer-copy-run", platformAgentRunId: null, delegatorAgentRunId: "host-run", startedAt: "2026-09-30T00:00:01.000Z", source: agentSource },
      ],
    },
    closed_task_executions: [],
    communication_messages: {
      schemaVersion: 1, subjectKind: "agent", hostRunId: "host-run",
      messages: [{
        messageId: "m1", senderAgentRunId: "reviewer-run", receiverAgentRunId: "host-run", content: "done",
        messageType: "agent_message", referenceFiles: [], createdAt: "2026-09-30T00:00:02.000Z",
      }],
    },
    agent_input_states: [],
    remote_task_executions: [],
    agent_statuses: [
      { member_address: "/code_reviewer", agent_run_id: "reviewer-run", status: "idle", trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
      { member_address: "/product_team/lead", agent_run_id: "lead-run", status: "offline", trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
      { member_address: "/code_reviewer", agent_run_id: "reviewer-copy-run", status: "offline", trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
    ],
    ...overrides,
  },
});

test("an Agent root tree has no collaborators; delegated runs carry their run identities", () => {
  const view = agentView();
  assert.equal(RootExecutionViewDtoSchema.parse(view).root_subject_kind, "agent");
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView({ execution_tree: { ...view.root_agent.execution_tree, collaborators: [] } })));
  const { agentRunId: _omit, ...withoutRun } = reviewerRun;
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView({ execution_tree: { ...view.root_agent.execution_tree, taskExecutions: [withoutRun] } })));
});

test("an Agent root view correlates host, children, messages and statuses", () => {
  assert.equal(RootExecutionViewDtoSchema.parse(agentView()).root_subject_kind, "agent");
  assert.throws(() => RootExecutionViewDtoSchema.parse({ ...agentView(), root_run_id: "other" }));
  const unknownStatus = agentView();
  unknownStatus.root_agent.agent_statuses[0].agent_run_id = "host-run";
  unknownStatus.root_agent.agent_statuses[0].member_address = "/research_assistant";
  assert.throws(() => RootExecutionViewDtoSchema.parse(unknownStatus), /status identity/);
});

test("Agent root events, lifecycle and commands use root kind 'agent'; SEND_MESSAGE takes mentions", () => {
  assert.equal(RootExecutionEventDtoSchema.parse({
    root_subject_kind: "agent", root_run_id: "host-run", change_sequence: 4,
    event: { kind: "task_execution_started", host_kind: "root", host_run_id: "host-run", execution: reviewerRun },
  }).event.kind, "task_execution_started");
  assert.throws(() => RootExecutionEventDtoSchema.parse({
    root_subject_kind: "agent", root_run_id: "host-run", change_sequence: 5,
    event: { kind: "collaborator_added", collaborator: productTeamRun },
  }));
  assert.equal(CollaborationStreamServerMessageSchema.parse({
    type: "ROOT_LIFECYCLE", payload: { root_subject_kind: "agent", root_run_id: "host-run", is_active: false },
  }).type, "ROOT_LIFECYCLE");
  const send = CollaborationStreamClientMessageSchema.parse({
    type: "SEND_MESSAGE",
    payload: {
      root_subject_kind: "agent", root_run_id: "host-run", target_agent_run_id: "reviewer-run", command_id: "c1",
      content: "hi", context_file_paths: [], image_urls: [], message_id: "m", dedupe_key: "d",
      mentions: [{ kind: "agent_team", definition_id: "product-team-def" }],
    },
  });
  assert.equal(send.payload.mentions.length, 1);
  assert.throws(() => CollaborationStreamClientMessageSchema.parse({
    type: "INTERRUPT_GENERATION",
    payload: { root_subject_kind: "agent_team", root_run_id: "r", target_agent_run_id: "a", command_id: "c" },
  }));
});

test("Org trees have no collaborators list", () => {
  const tree = {
    subjectKind: "agent_org", createdAt: "2026-09-01T00:00:00.000Z", archivedAt: null, applicationBinding: null, handoffs: [],
    rootOrg: {
      address: "/", orgDefinitionId: "org-def", orgDefinitionName: "Org", orgRunId: "org-run",
      defaultLaunchConfiguration: launchConfiguration, members: [], taskExecutions: [productTeamRun],
    },
  };
  assert.equal(agentOrgExecutionTreeDtoSchema.parse(tree).rootOrg.taskExecutions.length, 1);
  assert.throws(() => agentOrgExecutionTreeDtoSchema.parse({ ...tree, rootOrg: { ...tree.rootOrg, collaborators: [] } }));
});

test("Agent-root live input projection is required and carries held/queued recovery facts", () => {
  const view = agentView();
  const state = { run_instance_id: "native-instance", revision: 2, entries: [], recoverableBlock: {
    operationId: "op", failureEpoch: 1, position: { kind: "next_turn", failedTurnId: "A" },
    state: "awaiting_user", code: "failed", message: "retry required",
  } };
  view.root_agent.agent_input_states.push({ agent_run_id: "reviewer-run", state });
  assert.deepEqual(RootExecutionViewDtoSchema.parse(view).root_agent.agent_input_states[0].state, state);
  delete view.root_agent.agent_input_states;
  assert.throws(() => RootExecutionViewDtoSchema.parse(view));
});
