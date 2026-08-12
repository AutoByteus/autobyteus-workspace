import { afterEach, describe, expect, it } from "vitest";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import type { AgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import type { InterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import type { StartTaskAgentExecutionRequest } from "../../../src/agent-team-execution/domain/task-agent-execution.js";
import type { StartTaskTeamExecutionRequest } from "../../../src/agent-team-execution/domain/task-team-execution.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import {
  MixedAgentMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
  type TeamRunTaskDelegationEvent,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import type { TaskActivationEventLease } from "../../../src/agent-team-execution/services/task-activation-event-barrier.js";
import { disposeTaskAgentDirectory, getTaskAgentDirectory } from "../../../src/agent-team-execution/task-delegation/task-agent-directory.js";
import { TaskDelegationService } from "../../../src/agent-team-execution/task-delegation/task-delegation-service.js";
import {
  parseDelegateTaskInput,
  parseReviewTaskResultInput,
  parseSubmitTaskResultInput,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-input-parsers.js";
import { TASK_DELEGATION_TOOL_NAME_LIST } from "../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { createMemberLogicalAddressContext } from "../../../src/agent-team-execution/domain/member-logical-address-context.js";
import { TeamRecipientResolver } from "../../../src/agent-team-execution/services/team-recipient-resolver.js";
import { TeamRunTreeIndex } from "../../../src/agent-team-execution/services/team-run-tree-index.js";
import { clearTaskTeamActiveRunDirectory } from "../../../src/agent-team-execution/task-delegation/task-team-active-run-directory.js";
import {
  getTaskDelegationSystemTaskNotificationDisplayContent,
  TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY,
} from "../../../src/agent-team-execution/task-delegation/task-delegation-system-message-visibility.js";
import {
  address,
  testAgentNode,
  testAgentTeamNode,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

class FakeTeamRunBackend implements TeamRunBackend {
  readonly teamRunId = "team-run-1";
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly taskAgentStarts: StartTaskAgentExecutionRequest[] = [];
  readonly taskTeamStarts: StartTaskTeamExecutionRequest[] = [];
  readonly taskAgentSettlements: Array<{ address: AgentTeamAddress; runId: string; reason: string | null | undefined }> = [];
  readonly taskTeamSettlements: Array<{ address: AgentTeamAddress; runId: string; reason: string | null | undefined }> = [];
  readonly postedMessages: Array<{ message: AgentInputUserMessage; target?: AgentTeamAddress | null; targetAgentRunId?: string | null }> = [];
  readonly publishedEvents: TeamRunEvent[] = [];
  taskAgentStartResults: AgentOperationResult[] = [];
  taskAgentStartError: Error | null = null;
  postMessageResults: AgentOperationResult[] = [];
  private readonly listeners = new Set<TeamRunEventListener>();
  private activeLease: TaskActivationEventLease | null = null;

  getRuntimeContext() { return null; }
  isActive(): boolean { return true; }
  getLeafAgentStatusSnapshots() { return []; }
  hasOpenExecutionWork() { return false; }
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  async postMessage(message: AgentInputUserMessage, target?: AgentTeamAddress | null, targetAgentRunId?: string | null): Promise<AgentOperationResult> {
    this.postedMessages.push({ message, target, targetAgentRunId });
    return this.postMessageResults.shift() ?? { accepted: true };
  }
  async deliverInterAgentMessage(_request: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> { return { accepted: true }; }
  async executeMemberCommand(): Promise<AgentOperationResult> { return { accepted: true }; }
  async deliverResolvedInterAgentMessage(): Promise<AgentOperationResult> { return { accepted: true }; }
  resolveRecipient(recipientAddress: string, caller: ReturnType<typeof createMemberLogicalAddressContext>) {
    return new TeamRecipientResolver().resolve(
      new TeamRunTreeIndex(buildTeamRunConfig().rootTeam),
      recipientAddress,
      caller,
    );
  }
  async approveToolInvocation(): Promise<AgentOperationResult> { return { accepted: true }; }
  async interruptMember(): Promise<AgentOperationResult> { return { accepted: true }; }
  async settleMember(): Promise<AgentOperationResult> { return { accepted: true }; }
  async startTaskAgentExecution(request: StartTaskAgentExecutionRequest): Promise<AgentOperationResult> {
    this.taskAgentStarts.push(request);
    if (this.taskAgentStartError) throw this.taskAgentStartError;
    return this.taskAgentStartResults.shift() ?? { accepted: true };
  }
  releaseTaskAgentExecutionWork(): void {}
  async settleTaskAgentExecution(address: AgentTeamAddress, taskAgentRunId: string, reason?: string | null): Promise<AgentOperationResult> {
    this.taskAgentSettlements.push({ address, runId: taskAgentRunId, reason });
    return { accepted: true };
  }
  async startTaskTeamExecution(request: StartTaskTeamExecutionRequest): Promise<AgentOperationResult> {
    this.taskTeamStarts.push(request);
    return { accepted: true };
  }
  markTaskTeamExecutionActive(): void {}
  releaseTaskTeamExecutionWork(): void {}
  async postMessageToTaskTeamExecution(address: AgentTeamAddress, _taskTeamRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult> {
    this.postedMessages.push({ message, target: address, targetAgentRunId: null });
    return { accepted: true };
  }
  async settleTaskTeamExecution(address: AgentTeamAddress, taskTeamRunId: string, reason?: string | null): Promise<AgentOperationResult> {
    this.taskTeamSettlements.push({ address, runId: taskTeamRunId, reason });
    return { accepted: true };
  }
  async terminate(): Promise<AgentOperationResult> { return { accepted: true }; }
  publishEvent(event: TeamRunEvent): void {
    this.publishedEvents.push(event);
    for (const listener of this.listeners) listener(event);
  }
  openTaskActivationEventLease(executionAddress: ReturnType<typeof createTeamExecutionAddress>): TaskActivationEventLease {
    if (this.activeLease) throw new Error("A task activation event lease is already open.");
    this.activeLease = Object.freeze({ leaseId: `lease-${this.publishedEvents.length + 1}`, executionAddress });
    return this.activeLease;
  }
  assertTaskActivationEventLeaseWithinBudget(lease: TaskActivationEventLease): void {
    if (this.activeLease?.leaseId !== lease.leaseId) throw new Error("Task activation lease is not active.");
  }
  commitTaskActivationEventLease(lease: TaskActivationEventLease, event: TeamRunEvent): void {
    this.assertTaskActivationEventLeaseWithinBudget(lease);
    this.activeLease = null;
    this.publishEvent(event);
  }
  abortTaskActivationEventLease(lease: TaskActivationEventLease): void {
    this.assertTaskActivationEventLeaseWithinBudget(lease);
    this.activeLease = null;
  }
}

const buildTeamRunConfig = () => testTeamRunConfig({
  rootTeamRunId: "team-run-1",
  rootTeamDefinitionId: "team-def-1",
  coordinatorAddress: "/coordinator",
  children: [
    testAgentNode("/coordinator", {
      agentRunId: "run-coordinator",
      agentDefinitionId: "agent-coordinator",
      llmModelIdentifier: "model-coordinator",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentNode("/worker", {
      agentRunId: "run-worker",
      agentDefinitionId: "agent-worker",
      llmModelIdentifier: "model-worker",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentNode("/reviewer", {
      agentRunId: "run-reviewer",
      agentDefinitionId: "agent-reviewer",
      llmModelIdentifier: "model-reviewer",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentTeamNode({
      address: "/design_team",
      coordinatorAddress: "/design_team/team_lead",
      teamRunId: "run-design-team",
      teamDefinitionId: "team-def-design",
      children: [
        testAgentNode("/design_team/team_lead", {
          agentRunId: "run-team-lead",
          agentDefinitionId: "agent-team-lead",
          llmModelIdentifier: "model-team-lead",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        }),
      ],
    }),
  ],
});

const buildTeamRunContext = () => {
  const config = buildTeamRunConfig();
  return new TeamRunContext({
    teamRunId: "team-run-1",
    teamAddress: address("/"),
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: ["coordinator", "worker", "reviewer"].map((name) =>
        new MixedAgentMemberContext({
          address: address(`/${name}`),
          agentRunId: `run-${name}`,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: null,
        }),
      ),
      teamExecutionAddress: createTeamExecutionAddress({
        rootTeamRunId: "team-run-1",
        memberAddress: "/coordinator",
      }),
    }),
  });
};

const createService = (
  backend: FakeTeamRunBackend,
  persistedRecords: unknown[] = [],
): TaskDelegationService => {
  let allocationCounter = 0;
  let taskIdCounter = 0;
  const teamRun = new TeamRun({
    backend,
    context: buildTeamRunContext(),
  });

  return new TaskDelegationService(teamRun, {
    agentRunIdentityAllocator: {
      allocateForAgentDefinition: async (agentDefinitionId) => {
        allocationCounter += 1;
        const prefix = agentDefinitionId === "agent-reviewer" ? "reviewer" : "worker";
        return `${prefix}_${String(allocationCounter).padStart(32, "0")}`;
      },
    },
    recordsService: {
      reserveTaskId: async () => {
        taskIdCounter += 1;
        return `task_${String(taskIdCounter).padStart(4, "0")}`;
      },
      persistRecord: async (_scope, record) => {
        const index = persistedRecords.findIndex((entry) =>
          typeof entry === "object" &&
          entry !== null &&
          "taskId" in entry &&
          (entry as { taskId?: unknown }).taskId === record.taskId,
        );
        if (index >= 0) persistedRecords[index] = structuredClone(record);
        else persistedRecords.push(structuredClone(record));
      },
      persistActivationRecord: async (_scope, record) => {
        const index = persistedRecords.findIndex((entry) =>
          typeof entry === "object" &&
          entry !== null &&
          "taskId" in entry &&
          (entry as { taskId?: unknown }).taskId === record.taskId,
        );
        if (index >= 0) persistedRecords[index] = structuredClone(record);
        else persistedRecords.push(structuredClone(record));
      },
      getTaskDelegationRecords: async () => persistedRecords as never,
      resolveReference: async () => null,
    } as never,
  });
};

const persistentCaller = (memberAddress: string, agentRunId: string) => ({
  executionAddress: createTeamExecutionAddress({
    rootTeamRunId: "team-run-1",
    memberAddress,
  }),
  agentRunId,
});

const coordinator = persistentCaller("/coordinator", "run-coordinator");
const worker = persistentCaller("/worker", "run-worker");
const reviewer = persistentCaller("/reviewer", "run-reviewer");
const designTeam = { address: address("/design_team") };

const buildContext = (caller = coordinator, _members = [coordinator, worker, reviewer]) => ({
  teamRunId: "team-run-1",
  teamDefinitionId: "team-def-1",
  teamName: "Task Team",
  caller,
  coordinatorAddress: address("/coordinator"),
  addressing: createMemberLogicalAddressContext({
    rootTeamRunId: "team-run-1",
    memberAddress: caller.executionAddress.memberAddress,
  }),
});

const delegateMemberTask = (
  name: string,
  description: string,
  reference_files?: string[],
) => ({
  recipient_address: `./${name}`,
  description,
  ...(reference_files ? { reference_files } : {}),
});

const delegateTask = (
  service: TaskDelegationService,
  context: ReturnType<typeof buildContext>,
  input: ReturnType<typeof delegateMemberTask> | {
    recipient_address: string;
    description: string;
    reference_files?: string[];
  },
) => service.delegateTask(
  context,
  input,
  new TeamRecipientResolver().resolve(
    new TeamRunTreeIndex(buildTeamRunConfig().rootTeam),
    input.recipient_address,
    context.addressing,
  ),
);

const taskAgentIdentity = (start: StartTaskAgentExecutionRequest) => ({
  taskId: start.taskId,
  taskAgentRunId: start.receiver.taskAgentRunId!,
});

const taskTeamRunId = (start: StartTaskTeamExecutionRequest): string =>
  start.receiver.taskTeamRunIds.at(-1)!;

const buildTaskAgentCaller = (start: StartTaskAgentExecutionRequest) => {
  const identity = taskAgentIdentity(start);
  const directoryEntry = getTaskAgentDirectory("team-run-1")
    .resolveTaskAgentRunId(identity.taskAgentRunId);
  if (!directoryEntry) throw new Error(`Task AgentRun '${identity.taskAgentRunId}' is not active.`);
  return {
  executionAddress: createTeamExecutionAddress({
    rootTeamRunId: "team-run-1",
    memberAddress: directoryEntry.memberAddress,
    taskAgentRunId: identity.taskAgentRunId,
  }),
  agentRunId: identity.taskAgentRunId,
  taskAgentRunId: identity.taskAgentRunId,
  taskId: identity.taskId,
  };
};

const publishIdleEvent = (backend: FakeTeamRunBackend, taskId: string): void => {
  const start = backend.taskAgentStarts.find((candidate) => candidate.taskId === taskId)!;
  const identity = taskAgentIdentity(start);
  backend.publishEvent({
    eventSourceType: TeamRunEventSourceType.AGENT,
    execution: createTeamAgentExecutionBinding({
      executionAddress: start.receiver,
      agentRunId: identity.taskAgentRunId,
    }),
    payload: {
      eventType: "AGENT_STATUS",
      details: { status: "idle" },
      statusHint: "IDLE",
    },
  });
};

const taskDelegationPayloads = (
  backend: FakeTeamRunBackend,
  eventType: TeamRunTaskDelegationEvent["eventType"],
): unknown[] =>
  backend.publishedEvents
    .filter((event) => event.eventSourceType === TeamRunEventSourceType.TASK_DELEGATION)
    .map((event) => event.payload)
    .filter((payload) => payload.eventType === eventType)
    .map((payload) => payload.details);

const expectNoInternalNotificationDetails = (content: string): void => {
  for (const forbidden of [
    "New delegated task",
    "New delegated team task",
    "Accountable team",
    "Logical member",
    "target_agent_run_id",
    "task_agent_run_id",
    "task_team_run_id",
    "Task-agent run",
    "Task-team run ID",
    "task_team_instance_id",
    "Ingress coordinator",
    "Execution kind",
    "Lifecycle instructions",
    "Submission ID",
    "Review ID",
    "Reviewed submission ID",
    "send_message_to",
  ]) {
    expect(content).not.toContain(forbidden);
  }
};

const nextTick = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

afterEach(() => {
  disposeTaskAgentDirectory("team-run-1");
  clearTaskTeamActiveRunDirectory();
});

describe("TaskDelegationService", () => {
  it("delegates repeated singular active work with explicit member targets and submit_task_result work-packet protocol", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);

    const first = await delegateTask(service,buildContext(), delegateMemberTask("worker", "Draft the implementation note.", ["/tmp/source.md"]));
    const second = await delegateTask(service,buildContext(), delegateMemberTask("worker", "Review the tests."));

    expect(first).toEqual({
      task_id: "task_0001",
      status: "active",
    });
    expect(second).toEqual({
      task_id: "task_0002",
      status: "active",
    });
    expect(backend.taskAgentStarts).toHaveLength(2);
    expect(taskAgentIdentity(backend.taskAgentStarts[0]!)).toEqual({
      taskAgentRunId: "worker_00000000000000000000000000000001",
      taskId: "task_0001",
    });
    expect(backend.taskAgentStarts[0]!.receiver).toMatchObject({
      rootTeamRunId: "team-run-1",
      memberAddress: "/worker",
      taskAgentRunId: "worker_00000000000000000000000000000001",
    });
    expect(backend.taskAgentStarts[0]!.sourceNode).toMatchObject({
      kind: "agent",
      address: "/worker",
      agentRunId: "run-worker",
    });
    expect(backend.taskAgentStarts[0]!.receiver.taskAgentRunId).not.toContain("task_0001");
    expect(backend.taskAgentStarts[0]!.receiver.taskAgentRunId).not.toContain("team-run-1");
    expect(backend.taskAgentStarts[0]!.message.content).toContain("You have been activated for the delegated task below.");
    expect(backend.taskAgentStarts[0]!.message.content).toContain("Task ID: task_0001");
    expect(backend.taskAgentStarts[0]!.message.content).toContain("Draft the implementation note.");
    expect(backend.taskAgentStarts[0]!.message.content).toContain("submit_task_result");
    expect(backend.taskAgentStarts[0]!.message.content).toContain("review_task_result");
    expect(backend.taskAgentStarts[0]!.message.content).not.toContain("target_agent_run_id");
    expect(backend.taskAgentStarts[0]!.message.content).not.toContain("Original delegator");
    expect(backend.taskAgentStarts[0]!.message.content).not.toContain(["mark", "task", "completed"].join("_"));
    expect(backend.taskAgentStarts[0]!.message.content).not.toContain(["accept", "task"].join("_"));
    expect(backend.taskAgentStarts[0]!.message.metadata).toEqual(expect.objectContaining({
      sender_id: "system.task_delegation",
      team_run_id: "team-run-1",
      task_id: "task_0001",
      task_ids: ["task_0001"],
      execution_kind: "task_agent",
      target_agent_run_id: "worker_00000000000000000000000000000001",
      message_type: "task_delegation_work_packet",
      [TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY]: true,
      [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
    }));
    const activationDisplay = getTaskDelegationSystemTaskNotificationDisplayContent(backend.taskAgentStarts[0]!.message);
    expect(activationDisplay).toBe([
      "You have a new task.",
      "",
      "Task ID: task_0001",
      "",
      "Task:",
      "Draft the implementation note.",
      "",
      "Reference files:",
      "- /tmp/source.md",
    ].join("\n"));
    expect(activationDisplay).not.toContain("coordinator");
    expectNoInternalNotificationDetails(activationDisplay!);

    const activated = taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED") as Array<{
      senderAddress: ReturnType<typeof createTeamExecutionAddress>;
      taskId: string;
      content: string;
      referenceFiles: Array<{ referenceId: string; path: string }>;
    }>;
    expect(activated).toHaveLength(2);
    expect(activated[0]!.senderAddress).toEqual(coordinator.executionAddress);
    expect(activated[0]).toMatchObject({
      taskId: "task_0001",
      content: "Draft the implementation note.",
      referenceFiles: [expect.objectContaining({ path: "/tmp/source.md" })],
    });
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")?.taskId).toBe("task_0001");
  });


  it("resolves task-owned reference files by task identity without message IDs", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);

    await delegateTask(service,buildContext(), delegateMemberTask("worker", "Use the attached source.", ["/tmp/source.md"]));
    const activated = taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED") as Array<{ referenceFiles: Array<{ referenceId: string; path: string }> }>;
    const reference = activated[0]!.referenceFiles[0]!;

    expect(service.resolveTaskReference({ taskId: "task_0001", referenceId: reference.referenceId })).toEqual(
      expect.objectContaining({
        record: expect.objectContaining({ taskId: "task_0001" }),
        reference: expect.objectContaining({ path: "/tmp/source.md" }),
      }),
    );
    expect(service.resolveTaskReference({ taskId: "task_0001", referenceId: "missing" })).toBeNull();
  });

  it("rejects relative delegate_task reference files before task creation", async () => {
    const backend = new FakeTeamRunBackend();
    const persistedRecords: any[] = [];
    const service = createService(backend, persistedRecords);

    await expect(
      delegateTask(service,
        buildContext(),
        delegateMemberTask("worker", "Use the attached source.", ["math_problem_train_bird.txt"]),
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "reference_files must be an array of absolute local file path strings. Invalid index=0 reason=path must be absolute.",
    });

    expect(persistedRecords).toEqual([]);
    expect(backend.taskAgentStarts).toEqual([]);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toEqual([]);
  });

  it("rejects invalid absolute-looking delegate_task reference files before task creation", async () => {
    const backend = new FakeTeamRunBackend();
    const persistedRecords: any[] = [];
    const service = createService(backend, persistedRecords);

    await expect(
      delegateTask(service,
        buildContext(),
        delegateMemberTask("worker", "Use the attached source.", ["/tmp/../source.md"]),
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "reference_files must be an array of absolute local file path strings. Invalid index=0 reason=path contains route-template or relative segments.",
    });

    expect(persistedRecords).toEqual([]);
    expect(backend.taskAgentStarts).toEqual([]);
  });

  it("rejects relative submit_task_result reference files before submission persistence", async () => {
    const backend = new FakeTeamRunBackend();
    const persistedRecords: any[] = [];
    const service = createService(backend, persistedRecords);
    await delegateTask(service,buildContext(), delegateMemberTask("worker", "Do work."));
    const taskAgentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!);

    await expect(
      service.submitTaskResult(buildContext(taskAgentCaller), {
        message: "Implemented the requested work.",
        reference_files: ["relative-result.md"],
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "reference_files must be an array of absolute local file path strings. Invalid index=0 reason=path must be absolute.",
    });

    expect(persistedRecords).toHaveLength(1);
    expect(persistedRecords[0]).toMatchObject({
      taskId: "task_0001",
      status: "active",
      updates: [],
    });
  });

  it("rejects relative review_task_result reference files before review persistence", async () => {
    const backend = new FakeTeamRunBackend();
    const persistedRecords: any[] = [];
    const service = createService(backend, persistedRecords);
    await delegateTask(service,buildContext(), delegateMemberTask("worker", "Do work."));
    const taskAgentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!);
    await service.submitTaskResult(buildContext(taskAgentCaller), {
      message: "Implemented the requested work.",
      reference_files: ["/tmp/result.md"],
    });

    await expect(
      service.reviewTaskResult(buildContext(), {
        task_id: "task_0001",
        decision: "request_revision",
        comment: "Please revise.",
        reference_files: ["relative-revision.md"],
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "reference_files must be an array of absolute local file path strings. Invalid index=0 reason=path must be absolute.",
    });

    expect(persistedRecords).toHaveLength(1);
    expect(persistedRecords[0]).toMatchObject({
      taskId: "task_0001",
      status: "awaiting_review",
      updates: [
        expect.objectContaining({ kind: "submission" }),
      ],
    });
  });

  it("delegates to an explicit team target and binds a task-team execution instance", async () => {
    const backend = new FakeTeamRunBackend();
    const persistedRecords: any[] = [];
    const service = createService(backend, persistedRecords);

    const created = await delegateTask(service,
      buildContext(coordinator, [coordinator, worker, reviewer, designTeam]),
      {
        recipient_address: "./design_team",
        description: "Coordinate the design review.",
      },
    );

    expect(created).toEqual({
      task_id: "task_0001",
      status: "active",
    });
    expect(backend.taskAgentStarts).toHaveLength(0);
    expect(backend.taskTeamStarts).toHaveLength(1);
    const start = backend.taskTeamStarts[0]!;
    const activeTaskTeamRunId = taskTeamRunId(start);
    expect(start.taskId).toBe("task_0001");
    expect(start.teamNode).toMatchObject({
      kind: "agent_team",
      address: "/design_team",
      teamDefinitionId: "team-def-design",
      teamRunId: activeTaskTeamRunId,
      coordinatorAddress: "/design_team/team_lead",
    });
    expect(start.receiver).toEqual({
      rootTeamRunId: "team-run-1",
      taskTeamRunIds: [activeTaskTeamRunId],
      memberAddress: "/design_team/team_lead",
      taskAgentRunId: null,
    });
    expect(start.config.rootTeam.children.find(
      (node) => node.address === "/design_team",
    )).toMatchObject({ teamRunId: activeTaskTeamRunId });
    expect(persistedRecords).toHaveLength(1);
    expect(persistedRecords[0]).toMatchObject({
      taskId: "task_0001",
      status: "active",
      receiverTargetKind: "agent_team",
      receiverAddress: {
        rootTeamRunId: "team-run-1",
        taskTeamRunIds: [activeTaskTeamRunId],
        memberAddress: "/design_team/team_lead",
        taskAgentRunId: null,
      },
      taskRun: {
        address: {
          rootTeamRunId: "team-run-1",
          taskTeamRunIds: [activeTaskTeamRunId],
          memberAddress: "/design_team",
          taskAgentRunId: null,
        },
      },
    });
    expect(persistedRecords[0]).not.toHaveProperty("target");
    expect(persistedRecords[0]).not.toHaveProperty("ingress");
    expect(persistedRecords[0]).not.toHaveProperty("coordinator");
    expect(start.message.content).toContain("Your team is accountable for the delegated task below.");
    expect(start.message.content).toContain("Task ID: task_0001");
    expect(start.message.content).toContain("Coordinate the design review.");
    expect(start.message.content).not.toContain("Task-team run ID");
    expect(start.message.content).not.toContain(activeTaskTeamRunId);
    expect(start.message.content).not.toContain("Ingress coordinator");
    expect(start.message.metadata).toEqual(expect.objectContaining({
      sender_id: "system.task_delegation",
      team_run_id: "team-run-1",
      task_id: "task_0001",
      task_ids: ["task_0001"],
      execution_kind: "task_team",
      task_team_run_id: activeTaskTeamRunId,
      message_type: "task_team_delegation_work_packet",
      [TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY]: true,
      [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
    }));
    const teamActivationDisplay = getTaskDelegationSystemTaskNotificationDisplayContent(start.message);
    expect(teamActivationDisplay).toBe([
      "You have a new task.",
      "",
      "Task ID: task_0001",
      "",
      "Task:",
      "Coordinate the design review.",
      "",
      "Reference files:",
      "- None specified",
    ].join("\n"));
    expect(teamActivationDisplay).not.toContain("coordinator");
    expect(teamActivationDisplay).not.toContain("design_team");
    expectNoInternalNotificationDetails(teamActivationDisplay!);

    const activated = taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED") as Array<{ taskId: string; content: string }>;
    expect(activated[0]).toMatchObject({
      taskId: "task_0001",
      content: "Coordinate the design review.",
    });
  });

  it("keeps activation visible content task-centered instead of sender-framed", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);

    const created = await delegateTask(service,
      buildContext(),
      delegateMemberTask("worker", "Use visible names."),
    );

    expect(created).toEqual({
      task_id: "task_0001",
      status: "active",
    });
    expect(backend.taskAgentStarts[0]!.message.content).toContain("Task review owner: coordinator");
    const displayContent = getTaskDelegationSystemTaskNotificationDisplayContent(backend.taskAgentStarts[0]!.message);
    expect(displayContent).toBe([
      "You have a new task.",
      "",
      "Task ID: task_0001",
      "",
      "Task:",
      "Use visible names.",
      "",
      "Reference files:",
      "- None specified",
    ].join("\n"));
    expect(displayContent).not.toContain("coordinator");
    expect(displayContent).not.toContain("worker");
  });

  it("submits, revises, submits again, accepts latest pending submission, and settles after idle", async () => {
    const backend = new FakeTeamRunBackend();
    const persistedRecords: any[] = [];
    const service = createService(backend, persistedRecords);
    await delegateTask(service,buildContext(), delegateMemberTask("worker", "Do work."));
    const taskAgentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!);

    await expect(
      service.reviewTaskResult(buildContext(worker), { task_id: "task_0001", decision: "accept" }),
    ).rejects.toMatchObject({ code: "DELEGATOR_NOT_AUTHORIZED" });

    const submitted = await service.submitTaskResult(buildContext(taskAgentCaller), {
      message: "Implemented the requested work.",
      reference_files: ["/tmp/result.md"],
    });
    expect(submitted).toEqual({
      task_id: "task_0001",
      status: "awaiting_review",
    });
    expect(persistedRecords).toHaveLength(1);
    expect(persistedRecords[0]).toMatchObject({
      taskId: "task_0001",
      status: "awaiting_review",
      updates: [
        expect.objectContaining({
          kind: "submission",
          submissionId: "task_0001_submission_0001",
          content: "Implemented the requested work.",
          referenceFiles: [expect.objectContaining({ path: "/tmp/result.md", type: "file" })],
        }),
      ],
    });
    expect(backend.postedMessages[0]).toMatchObject({ targetAgentRunId: null });
    expect(backend.postedMessages[0]!.target).toBe("/coordinator");
    expect(backend.postedMessages[0]!.message.content).toContain("review_task_result");
    expect(backend.postedMessages[0]!.message.content).toContain("Task ID: task_0001");
    expect(backend.postedMessages[0]!.message.content).toContain("Implemented the requested work.");
    expect(backend.postedMessages[0]!.message.content).not.toContain("task_0001_submission_0001");
    expect(backend.postedMessages[0]!.message.content).not.toContain("Execution kind");
    expect(backend.postedMessages[0]!.message.metadata).toEqual(expect.objectContaining({
      sender_id: "system.task_delegation",
      team_run_id: "team-run-1",
      input_origin: "task_delegation_notification",
      task_notification_type: "result_submitted",
      task_id: "task_0001",
      submission_id: "task_0001_submission_0001",
      message_type: "task_result_submitted",
      target_member_address: "/coordinator",
      target_task_agent_run_id: null,
      target_task_team_run_id: null,
      [TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY]: true,
      [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
    }));
    const resultSubmittedDisplay = getTaskDelegationSystemTaskNotificationDisplayContent(backend.postedMessages[0]!.message);
    expect(resultSubmittedDisplay).toContain("A task result is ready for review.");
    expect(resultSubmittedDisplay).toContain("Task ID: task_0001");
    expect(resultSubmittedDisplay).toContain("Implemented the requested work.");
    expect(resultSubmittedDisplay).toContain("/tmp/result.md");
    expect(resultSubmittedDisplay).not.toContain("worker");
    expect(resultSubmittedDisplay).not.toContain("review_task_result");
    expectNoInternalNotificationDetails(resultSubmittedDisplay!);

    const revision = await service.reviewTaskResult(buildContext(), {
      task_id: "task_0001",
      decision: "request_revision",
      comment: "Please add tests.",
      reference_files: ["/tmp/revision.md"],
    });
    expect(revision).toEqual({
      task_id: "task_0001",
      status: "active",
    });
    expect(persistedRecords[0]).toMatchObject({
      taskId: "task_0001",
      status: "active",
      updates: [
        expect.objectContaining({ kind: "submission", submissionId: "task_0001_submission_0001" }),
        expect.objectContaining({
          kind: "review",
          reviewId: "task_0001_review_0001",
          reviewedSubmissionId: "task_0001_submission_0001",
          decision: "request_revision",
          content: "Please add tests.",
          referenceFiles: [expect.objectContaining({ path: "/tmp/revision.md", type: "file" })],
        }),
      ],
    });
    expect(backend.postedMessages[1]).toMatchObject({ targetAgentRunId: "worker_00000000000000000000000000000001" });
    expect(backend.postedMessages[1]!.target).toBe("/worker");
    expect(backend.postedMessages[1]!.message.content).toContain("submit_task_result");
    expect(backend.postedMessages[1]!.message.content).toContain("Please add tests.");
    expect(backend.postedMessages[1]!.message.content).not.toContain("task_0001_review_0001");
    expect(backend.postedMessages[1]!.message.content).not.toContain("task_0001_submission_0001");
    expect(backend.postedMessages[1]!.message.content).not.toContain("Execution kind");
    expect(backend.postedMessages[1]!.message.metadata).toEqual(expect.objectContaining({
      sender_id: "system.task_delegation",
      team_run_id: "team-run-1",
      input_origin: "task_delegation_notification",
      task_notification_type: "revision_requested",
      task_id: "task_0001",
      review_id: "task_0001_review_0001",
      reviewed_submission_id: "task_0001_submission_0001",
      message_type: "task_revision_requested",
      target_member_address: "/worker",
      target_task_agent_run_id: "worker_00000000000000000000000000000001",
      target_task_team_run_id: null,
      [TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY]: true,
      [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
    }));
    const revisionDisplay = getTaskDelegationSystemTaskNotificationDisplayContent(backend.postedMessages[1]!.message);
    expect(revisionDisplay).toContain("This task needs revision.");
    expect(revisionDisplay).toContain("Task ID: task_0001");
    expect(revisionDisplay).toContain("Please add tests.");
    expect(revisionDisplay).toContain("/tmp/revision.md");
    expect(revisionDisplay).not.toContain("coordinator");
    expect(revisionDisplay).not.toContain("submit_task_result");
    expectNoInternalNotificationDetails(revisionDisplay!);

    const resubmitted = await service.submitTaskResult(buildContext(taskAgentCaller), {
      message: "Added tests.",
    });
    expect(resubmitted).toEqual({
      task_id: "task_0001",
      status: "awaiting_review",
    });
    expect(persistedRecords[0]).toMatchObject({
      taskId: "task_0001",
      status: "awaiting_review",
      updates: [
        expect.objectContaining({ submissionId: "task_0001_submission_0001" }),
        expect.objectContaining({ reviewId: "task_0001_review_0001" }),
        expect.objectContaining({
          kind: "submission",
          submissionId: "task_0001_submission_0002",
          content: "Added tests.",
        }),
      ],
    });

    const accepted = await service.reviewTaskResult(buildContext(), {
      task_id: "task_0001",
      decision: "accept",
      comment: "Accepted",
    });
    expect(accepted).toEqual({
      task_id: "task_0001",
      status: "accepted",
    });
    expect(persistedRecords).toHaveLength(1);
    expect(persistedRecords[0]).toMatchObject({
      taskId: "task_0001",
      status: "accepted",
      updates: [
        expect.objectContaining({ submissionId: "task_0001_submission_0001" }),
        expect.objectContaining({ reviewId: "task_0001_review_0001" }),
        expect.objectContaining({ submissionId: "task_0001_submission_0002" }),
        expect.objectContaining({
          kind: "review",
          reviewId: "task_0001_review_0002",
          reviewedSubmissionId: "task_0001_submission_0002",
          decision: "accept",
          content: "Accepted",
        }),
      ],
    });
    expect(persistedRecords[0]).not.toHaveProperty("pendingSubmissionId");
    expect(persistedRecords[0]).not.toHaveProperty("submissions");
    expect(persistedRecords[0]).not.toHaveProperty("reviews");
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_RESULT_SUBMITTED")).toHaveLength(2);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_RESULT_REVIEWED")).toEqual([
      expect.objectContaining({ taskId: "task_0001", reviewId: "task_0001_review_0001", reviewedSubmissionId: "task_0001_submission_0001", decision: "request_revision" }),
      expect.objectContaining({ taskId: "task_0001", reviewId: "task_0001_review_0002", reviewedSubmissionId: "task_0001_submission_0002", decision: "accept" }),
    ]);
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")?.taskId).toBe("task_0001");

    publishIdleEvent(backend, "task_0001");
    await nextTick();
    expect(backend.taskAgentSettlements).toEqual([
      expect.objectContaining({ address: "/worker", runId: "worker_00000000000000000000000000000001" }),
    ]);
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")).toBeNull();
  });

  it("commits result submission and returns a concise message when notification delivery fails", async () => {
    const backend = new FakeTeamRunBackend();
    backend.postMessageResults = [{ accepted: false, code: "TARGET_UNAVAILABLE", message: "No recipient" }];
    const service = createService(backend);
    await delegateTask(service,buildContext(), delegateMemberTask("worker", "Do work."));
    const taskAgentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!);

    const submitted = await service.submitTaskResult(buildContext(taskAgentCaller), {
      message: "Done despite notification failure.",
    });

    expect(submitted).toEqual({
      task_id: "task_0001",
      status: "awaiting_review",
      message: "No recipient",
    });
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_RESULT_SUBMITTED")).toEqual([
      expect.objectContaining({
        taskId: "task_0001",
        submissionId: "task_0001_submission_0001",
      }),
    ]);
    await expect(
      service.submitTaskResult(buildContext(taskAgentCaller), { message: "Duplicate while awaiting." }),
    ).rejects.toMatchObject({ code: "TASK_NOT_ACTIVE_FOR_RESULT" });
  });

  it("returns only a concise message when revision notification delivery fails", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    await delegateTask(service,buildContext(), delegateMemberTask("worker", "Do work."));
    const taskAgentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!);
    await service.submitTaskResult(buildContext(taskAgentCaller), {
      message: "Ready for review.",
    });
    backend.postMessageResults = [{ accepted: false, code: "TARGET_UNAVAILABLE", message: "No recipient" }];

    const revision = await service.reviewTaskResult(buildContext(), {
      task_id: "task_0001",
      decision: "request_revision",
      comment: "Please revise.",
    });

    expect(revision).toEqual({
      task_id: "task_0001",
      status: "active",
      message: "No recipient",
    });
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_RESULT_REVIEWED")).toEqual([
      expect.objectContaining({
        taskId: "task_0001",
        reviewId: "task_0001_review_0001",
        reviewedSubmissionId: "task_0001_submission_0001",
        decision: "request_revision",
      }),
    ]);
  });

  it("keeps rejected activations not_started and does not publish active exact-run targets", async () => {
    const backend = new FakeTeamRunBackend();
    backend.taskAgentStartResults = [{ accepted: false, code: "REJECTED", message: "No" }];
    const persistedRecords: unknown[] = [];
    const service = createService(backend, persistedRecords);

    const created = await delegateTask(service,buildContext(), delegateMemberTask("worker", "Cannot start."));

    expect(created).toEqual({
      task_id: "task_0001",
      status: "not_started",
      message: "No",
    });
    expect(persistedRecords).toEqual([]);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toEqual([]);
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")).toBeNull();
  });

  it("rolls back task-agent directory and ledger state when activation throws", async () => {
    const backend = new FakeTeamRunBackend();
    backend.taskAgentStartError = new Error("task-agent post failed");
    const service = createService(backend);

    const created = await delegateTask(service,buildContext(), delegateMemberTask("worker", "Start throws."));

    expect(backend.taskAgentStarts).toHaveLength(1);
    expect(created).toEqual({
      task_id: "task_0001",
      status: "not_started",
      message: "task-agent post failed",
    });
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toEqual([]);
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")).toBeNull();
  });

  it("supports task-agent delegators and blocks parent settlement while child delegation is open", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    await delegateTask(service,buildContext(), delegateMemberTask("worker", "Parent task."));
    const parentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!);

    const child = await delegateTask(service,buildContext(parentCaller), delegateMemberTask("reviewer", "Nested child task."));
    expect(child).toMatchObject({ task_id: "task_0002", status: "active" });
    expect(backend.taskAgentStarts[1]!.message.content).toContain("Task ID: task_0002");
    expect(backend.taskAgentStarts[1]!.message.content).toContain("Nested child task.");
    expect(backend.taskAgentStarts[1]!.message.content).not.toContain("Original delegator");
    expect(backend.taskAgentStarts[1]!.message.content).not.toContain(parentCaller.taskAgentRunId);

    await service.submitTaskResult(buildContext(parentCaller), { message: "Parent complete." });
    await service.reviewTaskResult(buildContext(), { task_id: "task_0001", decision: "accept" });
    publishIdleEvent(backend, "task_0001");
    await nextTick();
    expect(backend.taskAgentSettlements).toEqual([]);

    const childCaller = buildTaskAgentCaller(backend.taskAgentStarts[1]!);
    await service.submitTaskResult(buildContext(childCaller), { message: "Child complete." });
    expect(backend.postedMessages.at(-1)).toMatchObject({ targetAgentRunId: "worker_00000000000000000000000000000001" });

    await expect(
      service.reviewTaskResult(buildContext({
        ...parentCaller,
        taskId: "wrong",
      }), { task_id: "task_0002", decision: "accept" }),
    ).rejects.toMatchObject({ code: "DELEGATOR_NOT_AUTHORIZED" });
    await service.reviewTaskResult(buildContext(parentCaller), { task_id: "task_0002", decision: "accept" });
    await nextTick();
    expect(backend.taskAgentSettlements).toEqual([
      expect.objectContaining({ address: "/worker", runId: "worker_00000000000000000000000000000001" }),
    ]);
  });

  it("rejects settled task-agent delegate_task before creating child work", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    await delegateTask(service,buildContext(), delegateMemberTask("worker", "Parent task."));
    const parentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!);

    await service.submitTaskResult(buildContext(parentCaller), { message: "Parent complete." });
    await service.reviewTaskResult(buildContext(), { task_id: "task_0001", decision: "accept" });
    publishIdleEvent(backend, "task_0001");
    await nextTick();
    expect(getTaskAgentDirectory("team-run-1").isTaskAgentRunSettled(parentCaller.taskAgentRunId)).toBe(true);

    const startsBefore = backend.taskAgentStarts.length;
    const activatedBefore = taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED").length;
    await expect(
      delegateTask(service,buildContext(parentCaller), delegateMemberTask("worker", "Stale child task.")),
    ).rejects.toMatchObject({ code: "TASK_AGENT_SETTLED" });

    expect(backend.taskAgentStarts).toHaveLength(startsBefore);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(activatedBefore);
  });

  it("rejects settled task-agent review identity before recording a child review", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    await delegateTask(service,buildContext(), delegateMemberTask("worker", "Parent task."));
    const parentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!);
    await delegateTask(service,buildContext(parentCaller), delegateMemberTask("reviewer", "Nested child task."));

    const childCaller = buildTaskAgentCaller(backend.taskAgentStarts[1]!);
    await service.submitTaskResult(buildContext(childCaller), { message: "Child complete." });
    const reviewedBefore = taskDelegationPayloads(backend, "TASK_DELEGATION_RESULT_REVIEWED").length;
    getTaskAgentDirectory("team-run-1").markSettledByTaskAgentRunId(parentCaller.taskAgentRunId);

    await expect(
      service.reviewTaskResult(buildContext(parentCaller), { task_id: "task_0002", decision: "accept" }),
    ).rejects.toMatchObject({ code: "TASK_AGENT_SETTLED" });

    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_RESULT_REVIEWED")).toHaveLength(reviewedBefore);
    expect(backend.taskAgentSettlements).toEqual([]);
  });

  it("exposes only delegate_task, submit_task_result, and review_task_result parsers/tools", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual(["delegate_task", "submit_task_result", "review_task_result"]);
    expect(parseDelegateTaskInput({ recipient_address: "./worker", description: "Do it" })).toEqual({
      recipient_address: "./worker",
      description: "Do it",
      reference_files: [],
    });
    expect(parseSubmitTaskResultInput({ message: "done" })).toEqual({
      message: "done",
      reference_files: [],
    });
    expect(parseReviewTaskResultInput({ task_id: "task_0001", decision: "accept" })).toEqual({
      task_id: "task_0001",
      decision: "accept",
      reference_files: [],
    });
    expect(parseReviewTaskResultInput({ task_id: "task_0001", decision: "request_revision", comment: "revise" })).toEqual({
      task_id: "task_0001",
      decision: "request_revision",
      comment: "revise",
      reference_files: [],
    });
    expect(() => parseDelegateTaskInput({ recipient_address: "./worker", description: "Do it", status: "done" })).toThrow(/Unrecognized key/);
    expect(() => parseDelegateTaskInput({ target: { kind: "member", name: "worker" }, description: "Do it" })).toThrow(/recipient_address/);
    expect(() => parseDelegateTaskInput({ member_name: "worker", description: "Do it" })).toThrow(/recipient_address/);
    expect(() => parseDelegateTaskInput({ tasks: [{ recipient_address: "./worker", description: "Do it" }] })).toThrow(/recipient_address/);
    expect(() => parseSubmitTaskResultInput({ task_id: "task_0001", message: "done" })).toThrow(/Unrecognized key/);
    expect(() => parseSubmitTaskResultInput({ message: "done", status: "done" })).toThrow(/Unrecognized key/);
    expect(() => parseReviewTaskResultInput({ task_id: "task_0001", decision: "request_revision" })).toThrow(/comment is required/);
    expect(() => parseReviewTaskResultInput({ task_id: "task_0001", decision: "request_revision", message: "legacy" })).toThrow(/Unrecognized key/);
    expect(() => parseReviewTaskResultInput({ task_id: "task_0001", decision: "accept", submission_id: "sub" })).toThrow(/Unrecognized key/);
  });
});
