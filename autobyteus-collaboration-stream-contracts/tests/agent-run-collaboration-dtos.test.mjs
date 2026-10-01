import test from "node:test";
import assert from "node:assert/strict";
import {
  CollaborationStreamClientMessageSchema,
  CollaborationStreamServerMessageSchema,
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
  agentOrgExecutionTreeDtoSchema,
  collaboratorEntryDtoSchema,
} from "../dist/index.js";

const launchConfiguration = {
  runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.6-sol", llmConfig: null,
  autoExecuteTools: false, workspaceRootPath: "/work",
};
const agentEntry = {
  kind: "agent", address: "/code_reviewer", agentDefinitionId: "reviewer-def",
  agentRunId: "reviewer-run", platformAgentRunId: null, launchConfiguration, addedAt: "2026-09-30T00:00:00.000Z", addedViaAgentRunId: "host-run",
};
const teamEntry = {
  kind: "agent_team", address: "/product_team", teamDefinitionId: "product-team-def", teamRunId: "product-team-run",
  coordinatorAddress: "/product_team/lead",
  members: [{ address: "/product_team/lead", agentDefinitionId: "lead-def", agentRunId: "lead-run", platformAgentRunId: null }],
  handoffs: [], defaultLaunchConfiguration: launchConfiguration, taskExecutions: [],
  addedAt: "2026-09-30T00:00:00.000Z", addedViaAgentRunId: "host-run",
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
      collaborators: [agentEntry, teamEntry],
      taskExecutions: [
        { address: "/code_reviewer", agentRunId: "reviewer-copy-run", platformAgentRunId: null, delegatorAgentRunId: "host-run", startedAt: "2026-09-30T00:00:01.000Z" },
      ],
    },
    communication_messages: {
      schemaVersion: 1, subjectKind: "agent", hostRunId: "host-run",
      messages: [{
        messageId: "m1", senderAgentRunId: "reviewer-run", receiverAgentRunId: "host-run", content: "done",
        messageType: "agent_message", referenceFiles: [], createdAt: "2026-09-30T00:00:02.000Z",
      }],
    },
    agent_statuses: [
      { member_address: "/code_reviewer", agent_run_id: "reviewer-run", status: "idle", trigger: null, tool_name: null, error_message: null, error_details: null },
      { member_address: "/product_team/lead", agent_run_id: "lead-run", status: "offline", trigger: null, tool_name: null, error_message: null, error_details: null },
      { member_address: "/code_reviewer", agent_run_id: "reviewer-copy-run", status: "offline", trigger: null, tool_name: null, error_message: null, error_details: null },
    ],
    ...overrides,
  },
});

test("collaborator entries carry their single instance's run identities", () => {
  assert.equal(collaboratorEntryDtoSchema.parse(agentEntry).kind, "agent");
  assert.equal(collaboratorEntryDtoSchema.parse(teamEntry).kind, "agent_team");
  const { agentRunId: _omit, ...withoutRun } = agentEntry;
  assert.throws(() => collaboratorEntryDtoSchema.parse(withoutRun));
  assert.throws(() => collaboratorEntryDtoSchema.parse({ ...teamEntry, members: [] }));
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
    event: { kind: "collaborator_added", collaborator: teamEntry },
  }).event.kind, "collaborator_added");
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

test("Org trees require the collaborators list", () => {
  const tree = {
    subjectKind: "agent_org", createdAt: "2026-09-01T00:00:00.000Z", archivedAt: null, applicationBinding: null, handoffs: [],
    rootOrg: {
      address: "/", orgDefinitionId: "org-def", orgDefinitionName: "Org", orgRunId: "org-run",
      defaultLaunchConfiguration: launchConfiguration, members: [], collaborators: [teamEntry], taskExecutions: [],
    },
  };
  assert.equal(agentOrgExecutionTreeDtoSchema.parse(tree).rootOrg.collaborators.length, 1);
  const { collaborators: _omitted, ...withoutCollaborators } = tree.rootOrg;
  assert.throws(() => agentOrgExecutionTreeDtoSchema.parse({ ...tree, rootOrg: withoutCollaborators }));
});
