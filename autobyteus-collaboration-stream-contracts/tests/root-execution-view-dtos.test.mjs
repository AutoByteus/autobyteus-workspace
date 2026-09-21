import test from "node:test";
import assert from "node:assert/strict";
import {
  CollaborationStreamClientMessageSchema,
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
} from "../dist/index.js";

const orgSnapshot = (orgRunId = "org-run-1") => ({
  root_subject_kind: "agent_org",
  root_run_id: "org-run-1",
  schema_version: 1,
  root_org: {
    base_change_sequence: 0,
    is_active: true,
    execution_tree: {
      schemaVersion: 1,
      subjectKind: "agent_org",
      createdAt: "2026-09-01T00:00:00.000Z",
      archivedAt: null,
      applicationBinding: null,
      handoffs: [],
      rootOrg: {
        address: "/",
        orgDefinitionId: "org-definition-1",
        orgDefinitionName: "Org",
        orgRunId,
        defaultLaunchConfiguration: {
          runtimeKind: "codex_app_server",
          llmModelIdentifier: "gpt-5.6-sol",
          llmConfig: null,
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY",
          workspaceRootPath: null,
        },
        members: [],
        taskExecutions: [],
      },
    },
    task_records: { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-run-1", records: [] },
    communication_messages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-run-1", messages: [] },
    agent_statuses: [],
  },
});

const launchConfiguration = {
  runtimeKind: "codex_app_server",
  llmModelIdentifier: "gpt-5.6-sol",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: "PRELOADED_ONLY",
  workspaceRootPath: null,
};

const configuredAgent = (address, agentRunId) => ({
  address,
  agentDefinitionId: `definition-${agentRunId}`,
  role: null,
  description: null,
  agentRunId,
  platformAgentRunId: null,
  launchConfiguration,
});

const configuredTeam = (address, teamRunId, coordinatorAddress, members) => ({
  address,
  teamDefinitionId: `definition-${teamRunId}`,
  role: null,
  description: null,
  teamRunId,
  coordinatorAddress,
  defaultLaunchConfiguration: launchConfiguration,
  members,
  taskExecutions: [],
});

const status = (member_address, agent_run_id) => ({
  member_address,
  agent_run_id,
  status: "idle",
  trigger: null,
  tool_name: null,
  error_message: null,
  error_details: null,
});

const taskRecord = (taskId, delegatorAgentRunId, recipientAddress, taskExecution) => ({
  taskId,
  delegatorAgentRunId,
  recipientAddress,
  taskExecution,
  description: `Task ${taskId}`,
  referenceFiles: [],
  status: "active",
  updates: [],
  createdAt: "2026-09-01T00:00:01.000Z",
});

test("requires explicit family and exact matching branch", () => {
  assert.equal(RootExecutionViewDtoSchema.parse({ root_subject_kind: "agent_team", root_run_id: "t", schema_version: 2, root_team: {} }).root_subject_kind, "agent_team");
  assert.equal(RootExecutionViewDtoSchema.parse(orgSnapshot()).root_subject_kind, "agent_org");
  assert.throws(() => RootExecutionViewDtoSchema.parse({ root_subject_kind: "agent_org", root_run_id: "o", schema_version: 2, root_team: {} }));
  assert.throws(() => RootExecutionViewDtoSchema.parse(orgSnapshot("another-org-run")), /root correlation mismatch/);
});

test("requires sequenced events and an exact Org-root client command", () => {
  const event = {
    kind: "communication",
    message: {
      messageId: "message-1",
      senderAgentRunId: "agent-1",
      receiverAgentRunId: "agent-2",
      content: "hello",
      messageType: "agent_message",
      referenceFiles: [],
      createdAt: "2026-09-01T00:00:00.000Z",
    },
  };
  assert.equal(RootExecutionEventDtoSchema.parse({ root_subject_kind: "agent_org", root_run_id: "org-run-1", change_sequence: 1, event }).change_sequence, 1);
  assert.throws(() => RootExecutionEventDtoSchema.parse({ root_subject_kind: "agent_org", root_run_id: "org-run-1", event: {} }));
  assert.equal(CollaborationStreamClientMessageSchema.parse({
    type: "SEND_MESSAGE",
    payload: {
      root_subject_kind: "agent_org",
      root_run_id: "org-run-1",
      target_agent_run_id: "agent-run-1",
      command_id: "command-1",
      content: "hello",
      context_file_paths: [],
      image_urls: [],
      message_id: "message-1",
      dedupe_key: "dedupe-1",
    },
  }).payload.root_run_id, "org-run-1");
});

test("requires one correlated status for every live Agent execution", () => {
  const snapshot = orgSnapshot();
  snapshot.root_org.execution_tree.rootOrg.members.push(configuredAgent("/lead", "agent-run-lead"));
  snapshot.root_org.execution_tree.rootOrg.taskExecutions.push({
    address: "/task-active",
    agentRunId: "agent-run-task-active",
    platformAgentRunId: null,
    startedAt: "2026-09-01T00:00:00.000Z",
    settledAt: null,
  }, {
    address: "/task-settled",
    agentRunId: "agent-run-task-settled",
    platformAgentRunId: null,
    startedAt: "2026-09-01T00:00:00.000Z",
    settledAt: "2026-09-01T00:01:00.000Z",
  });
  snapshot.root_org.agent_statuses.push(
    status("/lead", "agent-run-lead"),
    status("/task-active", "agent-run-task-active"),
  );
  assert.equal(RootExecutionViewDtoSchema.parse(snapshot).root_org.agent_statuses.length, 2);

  const missing = structuredClone(snapshot);
  missing.root_org.agent_statuses.pop();
  assert.throws(() => RootExecutionViewDtoSchema.parse(missing), /has no status record/);

  const duplicate = structuredClone(snapshot);
  duplicate.root_org.agent_statuses.push(status("/lead", "agent-run-lead"));
  assert.throws(() => RootExecutionViewDtoSchema.parse(duplicate), /is duplicated/);

  const settledStatus = structuredClone(snapshot);
  settledStatus.root_org.agent_statuses.push(status("/task-settled", "agent-run-task-settled"));
  assert.throws(() => RootExecutionViewDtoSchema.parse(settledStatus), /status identity mismatch/);
});

test("rejects duplicate and sidecar AgentOrg member identities", () => {
  const duplicate = orgSnapshot();
  duplicate.root_org.execution_tree.rootOrg.members.push(
    configuredAgent("/lead", "agent-run-lead"),
    configuredAgent("/other", "agent-run-lead"),
  );
  duplicate.root_org.agent_statuses.push(status("/lead", "agent-run-lead"));
  assert.throws(() => RootExecutionViewDtoSchema.parse(duplicate), /AgentRun identity.*duplicated/);

  const sidecars = orgSnapshot();
  sidecars.root_org.execution_tree.rootOrg.members.push(
    configuredAgent("/lead", "agent-run-lead"),
    configuredAgent("/reviewer", "agent-run-reviewer"),
  );
  sidecars.root_org.agent_statuses.push(
    status("/lead", "agent-run-lead"),
    status("/reviewer", "agent-run-reviewer"),
  );
  sidecars.root_org.communication_messages.messages.push({
    messageId: "message-1",
    senderAgentRunId: "agent-run-lead",
    receiverAgentRunId: "agent-run-missing",
    content: "hello",
    messageType: "agent_message",
    referenceFiles: [],
    createdAt: "2026-09-01T00:00:00.000Z",
  });
  assert.throws(() => RootExecutionViewDtoSchema.parse(sidecars), /communication message.*identity mismatch/);
});

test("requires each configured Team coordinator to be one of that Team's direct Agents", () => {
  const valid = orgSnapshot();
  valid.root_org.execution_tree.rootOrg.members.push(
    configuredAgent("/direct", "agent-run-direct"),
    configuredTeam("/team", "team-run", "/team/lead", [
      configuredAgent("/team/lead", "agent-run-lead"),
      configuredAgent("/team/worker", "agent-run-worker"),
    ]),
  );
  valid.root_org.agent_statuses.push(
    status("/direct", "agent-run-direct"),
    status("/team/lead", "agent-run-lead"),
    status("/team/worker", "agent-run-worker"),
  );
  assert.equal(RootExecutionViewDtoSchema.parse(valid).root_subject_kind, "agent_org");

  const miscorrelated = structuredClone(valid);
  miscorrelated.root_org.execution_tree.rootOrg.members[1].coordinatorAddress = "/direct";
  assert.throws(
    () => RootExecutionViewDtoSchema.parse(miscorrelated),
    /coordinator is not one of its direct Agent members/,
  );
});

test("correlates task-bearing restored or migrated state by fresh run identity while reusing configured addresses", () => {
  const snapshot = orgSnapshot();
  snapshot.root_org.execution_tree.rootOrg.members.push(
    configuredAgent("/director", "agent-run-director"),
    configuredAgent("/worker", "agent-run-worker-configured"),
    configuredTeam("/team", "team-run-configured", "/team/lead", [
      configuredAgent("/team/lead", "agent-run-lead-configured"),
      configuredAgent("/team/worker", "agent-run-team-worker-configured"),
    ]),
  );
  snapshot.root_org.execution_tree.rootOrg.taskExecutions.push({
    address: "/worker",
    agentRunId: "agent-run-worker-task",
    platformAgentRunId: null,
    startedAt: "2026-09-01T00:00:01.000Z",
    settledAt: null,
  }, {
    address: "/team",
    teamRunId: "team-run-task",
    members: [
      { address: "/team/lead", agentRunId: "agent-run-task-lead", platformAgentRunId: null },
      { address: "/team/worker", agentRunId: "agent-run-task-worker", platformAgentRunId: null },
    ],
    taskExecutions: [],
    startedAt: "2026-09-01T00:00:02.000Z",
    settledAt: null,
  });
  snapshot.root_org.task_records.records.push(
    taskRecord("task-agent", "agent-run-director", "/worker", { agentRunId: "agent-run-worker-task" }),
    taskRecord("task-team", "agent-run-director", "/team", { teamRunId: "team-run-task" }),
  );
  snapshot.root_org.agent_statuses.push(
    status("/director", "agent-run-director"),
    status("/worker", "agent-run-worker-configured"),
    status("/team/lead", "agent-run-lead-configured"),
    status("/team/worker", "agent-run-team-worker-configured"),
    status("/worker", "agent-run-worker-task"),
    status("/team/lead", "agent-run-task-lead"),
    status("/team/worker", "agent-run-task-worker"),
  );

  const parsed = RootExecutionViewDtoSchema.parse(snapshot);
  assert.equal(parsed.root_org.task_records.records.length, 2);
  assert.equal(parsed.root_org.agent_statuses.filter((entry) => entry.member_address === "/worker").length, 2);

  const configuredRunAsTask = structuredClone(snapshot);
  configuredRunAsTask.root_org.task_records.records[0].taskExecution = { agentRunId: "agent-run-worker-configured" };
  assert.throws(() => RootExecutionViewDtoSchema.parse(configuredRunAsTask), /task 'task-agent'.*execution identity mismatch/);

  const wrongExecutionAddress = structuredClone(snapshot);
  wrongExecutionAddress.root_org.execution_tree.rootOrg.taskExecutions[0].address = "/director";
  assert.throws(() => RootExecutionViewDtoSchema.parse(wrongExecutionAddress), /task 'task-agent'.*execution identity mismatch/);

  const duplicateConfiguredAddress = structuredClone(snapshot);
  duplicateConfiguredAddress.root_org.execution_tree.rootOrg.members.push(
    configuredAgent("/worker", "agent-run-duplicate-configured"),
  );
  assert.throws(() => RootExecutionViewDtoSchema.parse(duplicateConfiguredAddress), /configured address '\/worker'.*duplicated/);
});
