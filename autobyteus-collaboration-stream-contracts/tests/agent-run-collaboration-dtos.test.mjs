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
  address: "/code_reviewer", agentRunId: "reviewer-run", platformAgentRunId: null, delegatorAgentRunId: "agent-run",
  startedAt: "2026-09-30T00:00:00.000Z", source: agentSource,
};
const productTeamRun = {
  address: "/product_team", teamRunId: "product-team-run", delegatorAgentRunId: "agent-run", startedAt: "2026-09-30T00:00:00.000Z",
  members: [{ address: "/product_team/lead", agentRunId: "lead-run", platformAgentRunId: null }], taskExecutions: [],
  source: { kind: "agent_team", teamDefinitionId: "product-team-def", coordinatorAddress: "/product_team/lead", handoffs: [],
    members: [{ address: "/product_team/lead", agentDefinitionId: "lead-def", launchConfiguration }], defaultLaunchConfiguration: launchConfiguration },
};

const agentView = (overrides = {}) => ({
  root_subject_kind: "agent",
  root_run_id: "agent-run",
  root_agent: {
    base_change_sequence: 3,
    live_sequence_id: "live-1", last_message_change_sequence: 0,
    is_active: true,
    execution_tree: {
      subjectKind: "agent", createdAt: "2026-09-30T00:00:00.000Z",
      agent: { address: "/research_assistant", agentRunId: "agent-run", agentDefinitionId: "research-def" },
    },
    ...overrides,
  },
});

test("an Agent root view is its own agent's: the runs it delegated, their statuses and input are not in it (autobyteus-461 SR-083, SR-084)", () => {
  const view = agentView();
  assert.equal(RootExecutionViewDtoSchema.parse(view).root_subject_kind, "agent");
  for (const field of [
    { taskExecutions: [reviewerRun] }, { collaborators: [] },
  ]) assert.throws(() => RootExecutionViewDtoSchema.parse(agentView({ execution_tree: { ...view.root_agent.execution_tree, ...field } })));
  for (const field of [
    { closed_task_executions: [] }, { remote_task_executions: [] }, { agent_statuses: [] }, { agent_input_states: [] },
  ]) assert.throws(() => RootExecutionViewDtoSchema.parse(agentView(field)));
});

test("an Agent root view correlates its agent, and carries no message log (autobyteus-358)", () => {
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView({ communication_messages: { schemaVersion: 1, subjectKind: "agent", agentRunId: "agent-run", messages: [] } })));
  assert.equal(RootExecutionViewDtoSchema.parse(agentView()).root_subject_kind, "agent");
  assert.throws(() => RootExecutionViewDtoSchema.parse({ ...agentView(), root_run_id: "other" }), /agent correlation/);
});

test("an Agent root view names its live sequence, or null for a stored view; the field is required (autobyteus-358)", () => {
  assert.equal(RootExecutionViewDtoSchema.parse(agentView()).root_agent.live_sequence_id, "live-1");
  assert.equal(RootExecutionViewDtoSchema.parse(agentView({ live_sequence_id: null, last_message_change_sequence: null, is_active: false })).root_agent.live_sequence_id, null);
  const missing = agentView();
  delete missing.root_agent.live_sequence_id;
  assert.throws(() => RootExecutionViewDtoSchema.parse(missing));
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView({ live_sequence_id: "", last_message_change_sequence: 0 })));
  // The latest message sequence (SR-007) comes with the live sequence, and is never past the base.
  assert.equal(RootExecutionViewDtoSchema.parse(agentView({ last_message_change_sequence: 3 })).root_agent.last_message_change_sequence, 3);
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView({ last_message_change_sequence: 4 })), /past its base/);
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView({ last_message_change_sequence: null })), /together/);
  assert.throws(() => RootExecutionViewDtoSchema.parse(agentView({ live_sequence_id: null, is_active: false })), /together/);
});

test("Agent root events, lifecycle and commands use root kind 'agent'; SEND_MESSAGE takes mentions", () => {
  // A run it delegated is a row of its tree (`run_tree_changed`), not a row event (SR-084).
  for (const kind of ["task_execution_started", "task_executions_closed", "task_executions_reopened"]) {
    assert.throws(() => RootExecutionEventDtoSchema.parse({
      root_subject_kind: "agent", root_run_id: "agent-run", change_sequence: 4,
      event: { kind, host_kind: "root", host_run_id: "agent-run", execution: reviewerRun, task_executions: [{ agentRunId: "reviewer-run" }] },
    }));
  }
  assert.equal(RootExecutionEventDtoSchema.parse({ root_subject_kind: "agent", root_run_id: "agent-run", change_sequence: 4,
    event: { kind: "run_tree_changed", added: [], removed: [], updated: [] } }).event.kind, "run_tree_changed");
  assert.throws(() => RootExecutionEventDtoSchema.parse({
    root_subject_kind: "agent", root_run_id: "agent-run", change_sequence: 5,
    event: { kind: "collaborator_added", collaborator: productTeamRun },
  }));
  assert.equal(CollaborationStreamServerMessageSchema.parse({
    type: "ROOT_LIFECYCLE", payload: { root_subject_kind: "agent", root_run_id: "agent-run", is_active: false },
  }).type, "ROOT_LIFECYCLE");
  const send = CollaborationStreamClientMessageSchema.parse({
    type: "SEND_MESSAGE",
    payload: {
      root_subject_kind: "agent", root_run_id: "agent-run", target_agent_run_id: "reviewer-run", command_id: "c1",
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

test("Org trees have their own parts only: no collaborators list, no delegated runs (SR-084)", () => {
  const tree = {
    subjectKind: "agent_org", createdAt: "2026-09-01T00:00:00.000Z", archivedAt: null, applicationBinding: null, handoffs: [],
    rootOrg: {
      address: "/", orgDefinitionId: "org-def", orgDefinitionName: "Org", orgRunId: "org-run",
      defaultLaunchConfiguration: launchConfiguration, members: [],
    },
  };
  assert.equal(agentOrgExecutionTreeDtoSchema.parse(tree).rootOrg.members.length, 0);
  assert.throws(() => agentOrgExecutionTreeDtoSchema.parse({ ...tree, rootOrg: { ...tree.rootOrg, collaborators: [] } }));
  assert.throws(() => agentOrgExecutionTreeDtoSchema.parse({ ...tree, rootOrg: { ...tree.rootOrg, taskExecutions: [productTeamRun] } }));
});

test("an Agent root's message event carries its two parties; each names its run ID, its address and its node when another (autobyteus-565)", () => {
  const message = { messageId: "m1", senderAgentRunId: "pm-a", receiverAgentRunId: "pm-b", content: "hi", messageType: "agent_message",
    referenceFiles: [], createdAt: "2026-11-01T00:00:00.000Z" };
  const parties = { sender: { agentRunId: "pm-a", address: "/project_task_manager", nodeName: null },
    receiver: { agentRunId: "pm-b", address: null, nodeName: "docker" } };
  const event = (body) => ({ root_subject_kind: "agent", root_run_id: "pm-a", change_sequence: 1, event: { kind: "communication", message, ...body } });
  assert.deepEqual(RootExecutionEventDtoSchema.parse(event({ parties })).event.parties, parties);
  assert.throws(() => RootExecutionEventDtoSchema.parse(event({})));
  assert.throws(() => RootExecutionEventDtoSchema.parse(event({ parties: { sender: parties.sender } })));
  assert.throws(() => RootExecutionEventDtoSchema.parse(event({ parties: { ...parties, receiver: { agentRunId: "pm-b", address: "" , nodeName: null } } })));
  assert.throws(() => RootExecutionEventDtoSchema.parse(event({ parties: { ...parties, receiver: { agentRunId: "pm-b", address: null } } })));
  // The Org root's message event is unchanged: it carries no parties (REQ-006).
  assert.throws(() => RootExecutionEventDtoSchema.parse({ root_subject_kind: "agent_org", root_run_id: "org", change_sequence: 1,
    event: { kind: "communication", message, parties } }));
});

