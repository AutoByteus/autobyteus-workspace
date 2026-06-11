import { afterEach, describe, expect, it } from "vitest";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { InterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import type {
  StartTaskAgentInstanceRequest,
} from "../../../src/agent-team-execution/domain/task-agent-instance.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
  type TeamRunTaskDelegationEventPayload,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import type { TeamMemberSelector } from "../../../src/agent-team-execution/domain/team-run-member-identity.js";
import { disposeTaskAgentDirectory, getTaskAgentDirectory } from "../../../src/agent-team-execution/task-delegation/task-agent-directory.js";
import { TaskDelegationService } from "../../../src/agent-team-execution/task-delegation/task-delegation-service.js";
import {
  parseDelegateTasksInput,
  parseReviewTaskResultInput,
  parseSubmitTaskResultInput,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-input-parsers.js";
import { TASK_DELEGATION_TOOL_NAME_LIST } from "../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

class FakeTeamRunBackend implements TeamRunBackend {
  readonly runId = "team-run-1";
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly taskAgentStarts: StartTaskAgentInstanceRequest[] = [];
  readonly taskAgentSettlements: Array<{ routeKey: string; runId: string; reason: string | null | undefined }> = [];
  readonly postedMessages: Array<{ message: AgentInputUserMessage; target?: TeamMemberSelector | null; targetMemberRunId?: string | null }> = [];
  readonly publishedEvents: TeamRunEvent[] = [];
  taskAgentStartResults: AgentOperationResult[] = [];
  taskAgentStartError: Error | null = null;
  postMessageResults: AgentOperationResult[] = [];
  private readonly listeners = new Set<TeamRunEventListener>();

  getRuntimeContext() { return null; }
  isActive(): boolean { return true; }
  getStatusSnapshot() { return { status: "running" as const, source_path: [] }; }
  getMemberStatusSnapshots() { return []; }
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  async postMessage(message: AgentInputUserMessage, target?: TeamMemberSelector | null, targetMemberRunId?: string | null): Promise<AgentOperationResult> {
    this.postedMessages.push({ message, target, targetMemberRunId });
    return this.postMessageResults.shift() ?? { accepted: true };
  }
  async deliverInterAgentMessage(_request: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> { return { accepted: true }; }
  async approveToolInvocation(): Promise<AgentOperationResult> { return { accepted: true }; }
  async interruptMember(): Promise<AgentOperationResult> { return { accepted: true }; }
  async settleMember(): Promise<AgentOperationResult> { return { accepted: true }; }
  async startTaskAgentInstance(request: StartTaskAgentInstanceRequest): Promise<AgentOperationResult> {
    this.taskAgentStarts.push(request);
    if (this.taskAgentStartError) {
      throw this.taskAgentStartError;
    }
    return this.taskAgentStartResults.shift() ?? { accepted: true };
  }
  async settleTaskAgentInstance(logicalMemberRouteKey: string, taskAgentRunId: string, reason?: string | null): Promise<AgentOperationResult> {
    this.taskAgentSettlements.push({ routeKey: logicalMemberRouteKey, runId: taskAgentRunId, reason });
    return { accepted: true };
  }
  async terminate(): Promise<AgentOperationResult> { return { accepted: true }; }
  publishEvent(event: TeamRunEvent): void {
    this.publishedEvents.push(event);
    for (const listener of this.listeners) listener(event);
  }
}

const createService = (backend: FakeTeamRunBackend): TaskDelegationService => {
  let allocationCounter = 0;
  const teamRun = new TeamRun({
    backend,
    config: new TeamRunConfig({
      teamDefinitionId: "team-def-1",
      teamBackendKind: TeamBackendKind.MIXED,
      memberConfigs: [
        {
          memberName: "coordinator",
          memberRouteKey: "coordinator",
          memberRunId: "run-coordinator",
          agentDefinitionId: "agent-coordinator",
          llmModelIdentifier: "model-coordinator",
          autoExecuteTools: false,
          skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        },
        {
          memberName: "worker",
          memberRouteKey: "worker",
          memberRunId: "run-worker",
          agentDefinitionId: "agent-worker",
          llmModelIdentifier: "model-worker",
          autoExecuteTools: false,
          skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        },
      ],
    }),
  });

  return new TaskDelegationService(teamRun, {
    agentRunIdentityAllocator: {
      allocateForAgentDefinition: async () => {
        allocationCounter += 1;
        return `worker_${String(allocationCounter).padStart(32, "0")}`;
      },
    },
  });
};

const coordinator = {
  memberName: "coordinator",
  memberPath: ["coordinator"],
  memberRouteKey: "coordinator",
  memberRunId: "run-coordinator",
};

const worker = {
  memberName: "worker",
  memberPath: ["worker"],
  memberRouteKey: "worker",
  memberRunId: "run-worker",
};

const buildContext = (caller = coordinator, members = [coordinator, worker]) => ({
  teamRunId: "team-run-1",
  teamDefinitionId: "team-def-1",
  teamName: "Task Team",
  caller,
  coordinatorMemberRouteKey: coordinator.memberRouteKey,
  members,
});

const buildTaskAgentCaller = (identity: StartTaskAgentInstanceRequest["identity"]) => ({
  ...worker,
  memberRunId: identity.taskAgentRunId,
  taskAgentRunId: identity.taskAgentRunId,
  taskId: identity.taskId,
  logicalMemberRouteKey: identity.logicalMember.memberRouteKey,
});

const publishIdleEvent = (backend: FakeTeamRunBackend, taskId: string): void => {
  const identity = backend.taskAgentStarts.find((start) => start.identity.taskId === taskId)!.identity;
  backend.publishEvent({
    eventSourceType: TeamRunEventSourceType.AGENT,
    teamRunId: backend.runId,
    sourcePath: identity.logicalMember.memberPath,
    data: {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberName: identity.logicalMember.memberName,
      memberRunId: identity.taskAgentRunId,
      memberPath: identity.logicalMember.memberPath,
      memberRouteKey: identity.logicalMember.memberRouteKey,
      taskAgentInstance: identity,
      agentEvent: {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: identity.taskAgentRunId,
        payload: { status: "idle" },
        statusHint: "IDLE",
      },
    },
  });
};

const taskDelegationPayloads = (
  backend: FakeTeamRunBackend,
  eventType: TeamRunTaskDelegationEventPayload["eventType"],
): unknown[] =>
  backend.publishedEvents
    .filter((event) => event.eventSourceType === TeamRunEventSourceType.TASK_DELEGATION)
    .map((event) => event.data as TeamRunTaskDelegationEventPayload)
    .filter((payload) => payload.eventType === eventType)
    .map((payload) => payload.payload);

const nextTick = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

afterEach(() => {
  disposeTaskAgentDirectory("team-run-1");
});

describe("TaskDelegationService", () => {
  it("delegates active work with target_agent_run_id and submit_task_result work-packet protocol", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);

    const created = await service.delegateTasks(buildContext(), {
      tasks: [
        { member_name: "worker", description: "Draft the implementation note.", reference_files: ["/tmp/source.md"] },
        { member_name: "worker", description: "Review the tests." },
      ],
    });

    expect(created.createdTasks).toEqual([
      expect.objectContaining({ member_name: "worker", task_id: "task_0001", target_agent_run_id: "worker_00000000000000000000000000000001", status: "active" }),
      expect.objectContaining({ member_name: "worker", task_id: "task_0002", target_agent_run_id: "worker_00000000000000000000000000000002", status: "active" }),
    ]);
    expect(created.activationResults.map((result) => result.target_agent_run_id)).toEqual([
      "worker_00000000000000000000000000000001",
      "worker_00000000000000000000000000000002",
    ]);
    expect(backend.taskAgentStarts).toHaveLength(2);
    expect(backend.taskAgentStarts[0]!.identity).toMatchObject({
      taskAgentRunId: "worker_00000000000000000000000000000001",
      taskId: "task_0001",
      teamRunId: "team-run-1",
      logicalMember: expect.objectContaining({
        memberRouteKey: "worker",
        templateMemberRunId: "run-worker",
      }),
    });
    expect(backend.taskAgentStarts[0]!.identity.taskAgentRunId).not.toContain("task_0001");
    expect(backend.taskAgentStarts[0]!.identity.taskAgentRunId).not.toContain("team-run-1");
    expect(backend.taskAgentStarts[0]!.message.content).toContain("Your target_agent_run_id: worker_00000000000000000000000000000001");
    expect(backend.taskAgentStarts[0]!.message.content).toContain("Original delegator: coordinator");
    expect(backend.taskAgentStarts[0]!.message.content).toContain("submit_task_result");
    expect(backend.taskAgentStarts[0]!.message.content).toContain("review_task_result");
    expect(backend.taskAgentStarts[0]!.message.content).not.toContain(["mark", "task", "completed"].join("_"));
    expect(backend.taskAgentStarts[0]!.message.content).not.toContain(["accept", "task"].join("_"));

    const activated = taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED") as Array<{ tasks: Array<{ targetAgentRunId: string; status: string }> }>;
    expect(activated).toHaveLength(2);
    expect(activated[0]!.tasks[0]).toMatchObject({ targetAgentRunId: "worker_00000000000000000000000000000001", status: "active" });
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")?.taskId).toBe("task_0001");
  });

  it("renders ordinary delegator identity with visible roster name, not route key", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    const leadCoordinator = {
      ...coordinator,
      memberName: "Lead Coordinator",
    };
    const namedWorker = {
      ...worker,
      memberName: "Worker Agent",
    };

    const created = await service.delegateTasks(
      buildContext(leadCoordinator, [leadCoordinator, namedWorker]),
      { tasks: [{ member_name: "Worker Agent", description: "Use visible names." }] },
    );

    expect(created.createdTasks[0]).toMatchObject({
      member_name: "Worker Agent",
      task_id: "task_0001",
      status: "active",
    });
    expect(backend.taskAgentStarts[0]!.message.content).toContain(
      "Original delegator: Lead Coordinator",
    );
  });

  it("submits, revises, submits again, accepts latest pending submission, and settles after idle", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    await service.delegateTasks(buildContext(), { tasks: [{ member_name: "worker", description: "Do work." }] });
    const taskAgentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!.identity);

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
      submission_id: "task_0001_submission_0001",
      notification_delivered: true,
      warnings: [],
    });
    expect(backend.postedMessages[0]).toMatchObject({ targetMemberRunId: null });
    expect(backend.postedMessages[0]!.target).toEqual({ kind: "route_key", memberRouteKey: "coordinator" });
    expect(backend.postedMessages[0]!.message.content).toContain("review_task_result");
    expect(backend.postedMessages[0]!.message.content).toContain("task_0001_submission_0001");

    const revision = await service.reviewTaskResult(buildContext(), {
      task_id: "task_0001",
      decision: "request_revision",
      message: "Please add tests.",
      reference_files: ["/tmp/revision.md"],
    });
    expect(revision).toEqual({
      task_id: "task_0001",
      status: "active",
      decision: "request_revision",
      review_id: "task_0001_review_0001",
      reviewed_submission_id: "task_0001_submission_0001",
      notification_delivered: true,
      settlement_requested: false,
      warnings: [],
    });
    expect(backend.postedMessages[1]).toMatchObject({ targetMemberRunId: "worker_00000000000000000000000000000001" });
    expect(backend.postedMessages[1]!.target).toEqual({ kind: "route_key", memberRouteKey: "worker" });
    expect(backend.postedMessages[1]!.message.content).toContain("submit_task_result");

    const resubmitted = await service.submitTaskResult(buildContext(taskAgentCaller), {
      message: "Added tests.",
    });
    expect(resubmitted.submission_id).toBe("task_0001_submission_0002");

    const accepted = await service.reviewTaskResult(buildContext(), {
      task_id: "task_0001",
      decision: "accept",
      message: "Accepted",
    });
    expect(accepted).toEqual({
      task_id: "task_0001",
      status: "accepted",
      decision: "accept",
      review_id: "task_0001_review_0002",
      reviewed_submission_id: "task_0001_submission_0002",
      notification_delivered: null,
      settlement_requested: true,
      warnings: [],
    });
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_RESULT_SUBMITTED")).toHaveLength(2);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_RESULT_REVIEWED")).toEqual([
      expect.objectContaining({ reviewId: "task_0001_review_0001", reviewedSubmissionId: "task_0001_submission_0001", status: "active" }),
      expect.objectContaining({ reviewId: "task_0001_review_0002", reviewedSubmissionId: "task_0001_submission_0002", status: "accepted" }),
    ]);
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")?.taskId).toBe("task_0001");

    publishIdleEvent(backend, "task_0001");
    await nextTick();
    expect(backend.taskAgentSettlements).toEqual([
      expect.objectContaining({ routeKey: "worker", runId: "worker_00000000000000000000000000000001" }),
    ]);
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")).toBeNull();
  });

  it("commits result submission and returns deterministic warning when notification delivery fails", async () => {
    const backend = new FakeTeamRunBackend();
    backend.postMessageResults = [{ accepted: false, code: "TARGET_UNAVAILABLE", message: "No recipient" }];
    const service = createService(backend);
    await service.delegateTasks(buildContext(), { tasks: [{ member_name: "worker", description: "Do work." }] });
    const taskAgentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!.identity);

    const submitted = await service.submitTaskResult(buildContext(taskAgentCaller), {
      message: "Done despite notification failure.",
    });

    expect(submitted).toMatchObject({
      task_id: "task_0001",
      status: "awaiting_review",
      submission_id: "task_0001_submission_0001",
      notification_delivered: false,
      warnings: [
        expect.objectContaining({
          code: "TASK_NOTIFICATION_DELIVERY_FAILED",
          notification_type: "result_submitted",
          task_id: "task_0001",
          target_member_route_key: "coordinator",
          message: "No recipient",
        }),
      ],
    });
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_RESULT_SUBMITTED")).toHaveLength(1);
    await expect(
      service.submitTaskResult(buildContext(taskAgentCaller), { message: "Duplicate while awaiting." }),
    ).rejects.toMatchObject({ code: "TASK_NOT_ACTIVE_FOR_RESULT" });
  });

  it("keeps rejected activations not_started and does not publish active exact-run targets", async () => {
    const backend = new FakeTeamRunBackend();
    backend.taskAgentStartResults = [{ accepted: false, code: "REJECTED", message: "No" }];
    const service = createService(backend);

    const created = await service.delegateTasks(buildContext(), {
      tasks: [{ member_name: "worker", description: "Cannot start." }],
    });

    expect(created.createdTasks).toEqual([
      expect.objectContaining({ member_name: "worker", task_id: "task_0001", status: "not_started", target_agent_run_id: null }),
    ]);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toEqual([]);
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")).toBeNull();
  });

  it("rolls back task-agent directory and ledger state when activation throws", async () => {
    const backend = new FakeTeamRunBackend();
    backend.taskAgentStartError = new Error("task-agent post failed");
    const service = createService(backend);

    const created = await service.delegateTasks(buildContext(), {
      tasks: [{ member_name: "worker", description: "Start throws." }],
    });

    expect(backend.taskAgentStarts).toHaveLength(1);
    expect(created.createdTasks).toEqual([
      expect.objectContaining({
        member_name: "worker",
        task_id: "task_0001",
        status: "not_started",
        target_agent_run_id: null,
      }),
    ]);
    expect(created.activationResults).toEqual([
      expect.objectContaining({
        accepted: false,
        task_id: "task_0001",
        target_agent_run_id: null,
        message: "task-agent post failed",
      }),
    ]);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toEqual([]);
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")).toBeNull();
  });

  it("supports task-agent delegators and blocks parent settlement while child delegation is open", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    await service.delegateTasks(buildContext(), { tasks: [{ member_name: "worker", description: "Parent task." }] });
    const parentIdentity = backend.taskAgentStarts[0]!.identity;
    const parentCaller = buildTaskAgentCaller(parentIdentity);

    const child = await service.delegateTasks(buildContext(parentCaller), {
      tasks: [{ member_name: "worker", description: "Nested child task." }],
    });
    expect(child.createdTasks[0]).toMatchObject({ task_id: "task_0002", status: "active" });
    expect(backend.taskAgentStarts[1]!.message.content).toContain("Original delegator task-agent run: worker_00000000000000000000000000000001");

    await service.submitTaskResult(buildContext(parentCaller), { message: "Parent complete." });
    await service.reviewTaskResult(buildContext(), { task_id: "task_0001", decision: "accept" });
    publishIdleEvent(backend, "task_0001");
    await nextTick();
    expect(backend.taskAgentSettlements).toEqual([]);

    const childCaller = buildTaskAgentCaller(backend.taskAgentStarts[1]!.identity);
    await service.submitTaskResult(buildContext(childCaller), { message: "Child complete." });
    expect(backend.postedMessages.at(-1)).toMatchObject({ targetMemberRunId: "worker_00000000000000000000000000000001" });

    await expect(
      service.reviewTaskResult(buildContext({ ...parentCaller, taskId: "wrong" }), { task_id: "task_0002", decision: "accept" }),
    ).rejects.toMatchObject({ code: "DELEGATOR_NOT_AUTHORIZED" });
    await service.reviewTaskResult(buildContext(parentCaller), { task_id: "task_0002", decision: "accept" });
    await nextTick();
    expect(backend.taskAgentSettlements).toEqual([
      expect.objectContaining({ routeKey: "worker", runId: "worker_00000000000000000000000000000001" }),
    ]);
  });

  it("rejects settled task-agent delegate_tasks before creating child work", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    await service.delegateTasks(buildContext(), { tasks: [{ member_name: "worker", description: "Parent task." }] });
    const parentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!.identity);

    await service.submitTaskResult(buildContext(parentCaller), { message: "Parent complete." });
    await service.reviewTaskResult(buildContext(), { task_id: "task_0001", decision: "accept" });
    publishIdleEvent(backend, "task_0001");
    await nextTick();
    expect(getTaskAgentDirectory("team-run-1").isTaskAgentRunSettled(parentCaller.taskAgentRunId)).toBe(true);

    const startsBefore = backend.taskAgentStarts.length;
    const activatedBefore = taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED").length;
    await expect(
      service.delegateTasks(buildContext(parentCaller), {
        tasks: [{ member_name: "worker", description: "Stale child task." }],
      }),
    ).rejects.toMatchObject({ code: "TASK_AGENT_SETTLED" });

    expect(backend.taskAgentStarts).toHaveLength(startsBefore);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(activatedBefore);
  });

  it("rejects settled task-agent review identity before recording a child review", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    await service.delegateTasks(buildContext(), { tasks: [{ member_name: "worker", description: "Parent task." }] });
    const parentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!.identity);
    await service.delegateTasks(buildContext(parentCaller), {
      tasks: [{ member_name: "worker", description: "Nested child task." }],
    });

    const childCaller = buildTaskAgentCaller(backend.taskAgentStarts[1]!.identity);
    await service.submitTaskResult(buildContext(childCaller), { message: "Child complete." });
    const reviewedBefore = taskDelegationPayloads(backend, "TASK_DELEGATION_RESULT_REVIEWED").length;
    getTaskAgentDirectory("team-run-1").markSettledByTaskAgentRunId(parentCaller.taskAgentRunId);

    await expect(
      service.reviewTaskResult(buildContext(parentCaller), { task_id: "task_0002", decision: "accept" }),
    ).rejects.toMatchObject({ code: "TASK_AGENT_SETTLED" });

    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_RESULT_REVIEWED")).toHaveLength(reviewedBefore);
    expect(backend.taskAgentSettlements).toEqual([]);
  });

  it("exposes only delegate_tasks, submit_task_result, and review_task_result parsers/tools", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual(["delegate_tasks", "submit_task_result", "review_task_result"]);
    expect(parseDelegateTasksInput({ tasks: [{ member_name: "worker", description: "Do it" }] })).toEqual({
      tasks: [{ member_name: "worker", description: "Do it", reference_files: [] }],
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
    expect(parseReviewTaskResultInput({ task_id: "task_0001", decision: "request_revision", message: "revise" })).toEqual({
      task_id: "task_0001",
      decision: "request_revision",
      message: "revise",
      reference_files: [],
    });
    expect(() => parseDelegateTasksInput({ tasks: [{ member_name: "worker", description: "Do it", status: "done" }] })).toThrow(/Unrecognized key/);
    expect(() => parseSubmitTaskResultInput({ task_id: "task_0001", message: "done" })).toThrow(/Unrecognized key/);
    expect(() => parseSubmitTaskResultInput({ message: "done", status: "done" })).toThrow(/Unrecognized key/);
    expect(() => parseReviewTaskResultInput({ task_id: "task_0001", decision: "request_revision" })).toThrow(/message is required/);
    expect(() => parseReviewTaskResultInput({ task_id: "task_0001", decision: "accept", submission_id: "sub" })).toThrow(/Unrecognized key/);
  });
});
