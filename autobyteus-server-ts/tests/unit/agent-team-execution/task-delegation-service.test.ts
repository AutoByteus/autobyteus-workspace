import { afterEach, describe, expect, it } from "vitest";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { InterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import type {
  StartTaskAgentInstanceRequest,
} from "../../../src/agent-team-execution/domain/task-agent-instance.js";
import type { StartTaskTeamInstanceRequest } from "../../../src/agent-team-execution/domain/task-team-instance.js";
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
  parseDelegateTaskInput,
  parseReviewTaskResultInput,
  parseSubmitTaskResultInput,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-input-parsers.js";
import { TASK_DELEGATION_TOOL_NAME_LIST } from "../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { clearTaskTeamActiveRunDirectory } from "../../../src/agent-team-execution/task-delegation/task-team-active-run-directory.js";

class FakeTeamRunBackend implements TeamRunBackend {
  readonly runId = "team-run-1";
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly taskAgentStarts: StartTaskAgentInstanceRequest[] = [];
  readonly taskTeamStarts: StartTaskTeamInstanceRequest[] = [];
  readonly taskAgentSettlements: Array<{ routeKey: string; runId: string; reason: string | null | undefined }> = [];
  readonly taskTeamSettlements: Array<{ routeKey: string; runId: string; reason: string | null | undefined }> = [];
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
  async startTaskTeamInstance(request: StartTaskTeamInstanceRequest): Promise<AgentOperationResult> {
    this.taskTeamStarts.push(request);
    return { accepted: true };
  }
  async postMessageToTaskTeamInstance(_logicalTeamRouteKey: string, _taskTeamRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult> {
    this.postedMessages.push({ message, target: null, targetMemberRunId: null });
    return { accepted: true };
  }
  async settleTaskTeamInstance(logicalTeamRouteKey: string, taskTeamRunId: string, reason?: string | null): Promise<AgentOperationResult> {
    this.taskTeamSettlements.push({ routeKey: logicalTeamRouteKey, runId: taskTeamRunId, reason });
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
        {
          memberName: "reviewer",
          memberRouteKey: "reviewer",
          memberRunId: "run-reviewer",
          agentDefinitionId: "agent-reviewer",
          llmModelIdentifier: "model-reviewer",
          autoExecuteTools: false,
          skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        },
        {
          memberKind: "agent_team",
          memberName: "design_team",
          memberPath: ["design_team"],
          memberRouteKey: "design_team",
          memberRunId: "run-design-team",
          teamDefinitionId: "team-def-design",
          coordinatorMemberRouteKey: "design_team/team_lead",
          childTeamRunId: "run-design-team",
          memberConfigs: [
            {
              memberName: "team_lead",
              memberPath: ["design_team", "team_lead"],
              memberRouteKey: "design_team/team_lead",
              memberRunId: "run-team-lead",
              agentDefinitionId: "agent-team-lead",
              llmModelIdentifier: "model-team-lead",
              autoExecuteTools: false,
              skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            },
          ],
        },
      ],
    }),
  });

  return new TaskDelegationService(teamRun, {
    agentRunIdentityAllocator: {
      allocateForAgentDefinition: async (agentDefinitionId) => {
        allocationCounter += 1;
        const prefix = agentDefinitionId === "agent-reviewer" ? "reviewer" : "worker";
        return `${prefix}_${String(allocationCounter).padStart(32, "0")}`;
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

const reviewer = {
  memberName: "reviewer",
  memberPath: ["reviewer"],
  memberRouteKey: "reviewer",
  memberRunId: "run-reviewer",
};

const designTeam = {
  memberKind: "agent_team" as const,
  memberName: "design_team",
  memberPath: ["design_team"],
  memberRouteKey: "design_team",
  memberRunId: "run-design-team",
  teamDefinitionId: "team-def-design",
  childTeamRunId: "run-design-team",
  coordinatorMemberRouteKey: "design_team/team_lead",
  ingress: {
    memberName: "team_lead",
    memberPath: ["design_team", "team_lead"],
    memberRouteKey: "design_team/team_lead",
    memberRunId: "run-team-lead",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    role: null,
    description: null,
  },
  role: null,
  description: null,
};

const buildContext = (caller = coordinator, members = [coordinator, worker, reviewer]) => ({
  teamRunId: "team-run-1",
  teamDefinitionId: "team-def-1",
  teamName: "Task Team",
  caller,
  coordinatorMemberRouteKey: coordinator.memberRouteKey,
  members,
});

const delegateMemberTask = (
  name: string,
  description: string,
  reference_files?: string[],
) => ({
  target: { kind: "member" as const, name },
  description,
  ...(reference_files ? { reference_files } : {}),
});

const buildTaskAgentCaller = (identity: StartTaskAgentInstanceRequest["identity"]) => ({
  memberName: identity.logicalMember.memberName,
  memberPath: [...identity.logicalMember.memberPath],
  memberRouteKey: identity.logicalMember.memberRouteKey,
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
  clearTaskTeamActiveRunDirectory();
});

describe("TaskDelegationService", () => {
  it("delegates repeated singular active work with explicit member targets and submit_task_result work-packet protocol", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);

    const first = await service.delegateTask(buildContext(), delegateMemberTask("worker", "Draft the implementation note.", ["/tmp/source.md"]));
    const second = await service.delegateTask(buildContext(), delegateMemberTask("worker", "Review the tests."));

    expect(first).toEqual(expect.objectContaining({
      target: { kind: "member", name: "worker" },
      task_id: "task_0001",
      execution_kind: "task_agent",
      task_agent_run_id: "worker_00000000000000000000000000000001",
      task_team_run_id: null,
      status: "active",
      activation_accepted: true,
      message: null,
    }));
    expect(second).toEqual(expect.objectContaining({
      target: { kind: "member", name: "worker" },
      task_id: "task_0002",
      execution_kind: "task_agent",
      task_agent_run_id: "worker_00000000000000000000000000000002",
      task_team_run_id: null,
      status: "active",
      activation_accepted: true,
      message: null,
    }));
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

    const activated = taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED") as Array<{ tasks: Array<{ executionKind: string; executionRunId: string; status: string }> }>;
    expect(activated).toHaveLength(2);
    expect(activated[0]!.tasks[0]).toMatchObject({ executionKind: "task_agent", executionRunId: "worker_00000000000000000000000000000001", status: "active" });
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")?.taskId).toBe("task_0001");
  });

  it("delegates to an explicit team target and binds a task-team execution instance", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);

    const created = await service.delegateTask(
      buildContext(coordinator, [coordinator, worker, reviewer, designTeam]),
      {
        target: { kind: "team", name: "design_team" },
        description: "Coordinate the design review.",
      },
    );

    expect(created).toEqual(expect.objectContaining({
      target: { kind: "team", name: "design_team" },
      task_id: "task_0001",
      execution_kind: "task_team",
      task_agent_run_id: null,
      task_team_run_id: expect.stringMatching(/^design_team_[a-f0-9]{32}$/),
      status: "active",
      activation_accepted: true,
    }));
    expect(backend.taskAgentStarts).toHaveLength(0);
    expect(backend.taskTeamStarts).toHaveLength(1);
    const start = backend.taskTeamStarts[0]!;
    expect(start.identity).toMatchObject({
      taskTeamInstanceId: "task_team_task_0001",
      parentTeamRunId: "team-run-1",
      taskId: "task_0001",
      logicalTeam: expect.objectContaining({
        memberRouteKey: "design_team",
        templateMemberRunId: "run-design-team",
        teamDefinitionId: "team-def-design",
      }),
      ingress: expect.objectContaining({
        memberName: "team_lead",
        memberRouteKey: "team_lead",
      }),
    });
    expect(start.teamConfig.memberRunId).toBe(start.identity.taskTeamRunId);
    expect(start.message.content).toContain("Your team has been activated as accountable task target team:design_team");
    expect(start.message.content).toContain(`Task-team run ID: ${start.identity.taskTeamRunId}`);

    const activated = taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED") as Array<{ target: { kind: string }; tasks: Array<{ executionKind: string; executionRunId: string }> }>;
    expect(activated[0]).toMatchObject({
      target: { kind: "team" },
      tasks: [
        expect.objectContaining({
          executionKind: "task_team",
          executionRunId: start.identity.taskTeamRunId,
        }),
      ],
    });
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

    const created = await service.delegateTask(
      buildContext(leadCoordinator, [leadCoordinator, namedWorker]),
      delegateMemberTask("Worker Agent", "Use visible names."),
    );

    expect(created).toMatchObject({
      target: { kind: "member", name: "Worker Agent" },
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
    await service.delegateTask(buildContext(), delegateMemberTask("worker", "Do work."));
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
    await service.delegateTask(buildContext(), delegateMemberTask("worker", "Do work."));
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

    const created = await service.delegateTask(buildContext(), delegateMemberTask("worker", "Cannot start."));

    expect(created).toEqual(expect.objectContaining({
      target: { kind: "member", name: "worker" },
      task_id: "task_0001",
      execution_kind: null,
      task_agent_run_id: null,
      task_team_run_id: null,
      status: "not_started",
      activation_accepted: false,
      message: "No",
    }));
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toEqual([]);
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")).toBeNull();
  });

  it("rolls back task-agent directory and ledger state when activation throws", async () => {
    const backend = new FakeTeamRunBackend();
    backend.taskAgentStartError = new Error("task-agent post failed");
    const service = createService(backend);

    const created = await service.delegateTask(buildContext(), delegateMemberTask("worker", "Start throws."));

    expect(backend.taskAgentStarts).toHaveLength(1);
    expect(created).toEqual(expect.objectContaining({
      target: { kind: "member", name: "worker" },
      task_id: "task_0001",
      execution_kind: null,
      task_agent_run_id: null,
      task_team_run_id: null,
      status: "not_started",
      activation_accepted: false,
      message: "task-agent post failed",
    }));
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toEqual([]);
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("worker_00000000000000000000000000000001")).toBeNull();
  });

  it("supports task-agent delegators and blocks parent settlement while child delegation is open", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    await service.delegateTask(buildContext(), delegateMemberTask("worker", "Parent task."));
    const parentIdentity = backend.taskAgentStarts[0]!.identity;
    const parentCaller = buildTaskAgentCaller(parentIdentity);

    const child = await service.delegateTask(buildContext(parentCaller), delegateMemberTask("reviewer", "Nested child task."));
    expect(child).toMatchObject({ task_id: "task_0002", status: "active" });
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

  it("rejects settled task-agent delegate_task before creating child work", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    await service.delegateTask(buildContext(), delegateMemberTask("worker", "Parent task."));
    const parentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!.identity);

    await service.submitTaskResult(buildContext(parentCaller), { message: "Parent complete." });
    await service.reviewTaskResult(buildContext(), { task_id: "task_0001", decision: "accept" });
    publishIdleEvent(backend, "task_0001");
    await nextTick();
    expect(getTaskAgentDirectory("team-run-1").isTaskAgentRunSettled(parentCaller.taskAgentRunId)).toBe(true);

    const startsBefore = backend.taskAgentStarts.length;
    const activatedBefore = taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED").length;
    await expect(
      service.delegateTask(buildContext(parentCaller), delegateMemberTask("worker", "Stale child task.")),
    ).rejects.toMatchObject({ code: "TASK_AGENT_SETTLED" });

    expect(backend.taskAgentStarts).toHaveLength(startsBefore);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(activatedBefore);
  });

  it("rejects settled task-agent review identity before recording a child review", async () => {
    const backend = new FakeTeamRunBackend();
    const service = createService(backend);
    await service.delegateTask(buildContext(), delegateMemberTask("worker", "Parent task."));
    const parentCaller = buildTaskAgentCaller(backend.taskAgentStarts[0]!.identity);
    await service.delegateTask(buildContext(parentCaller), delegateMemberTask("reviewer", "Nested child task."));

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

  it("exposes only delegate_task, submit_task_result, and review_task_result parsers/tools", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual(["delegate_task", "submit_task_result", "review_task_result"]);
    expect(parseDelegateTaskInput({ target: { kind: "member", name: "worker" }, description: "Do it" })).toEqual({
      target: { kind: "member", name: "worker" },
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
    expect(parseReviewTaskResultInput({ task_id: "task_0001", decision: "request_revision", message: "revise" })).toEqual({
      task_id: "task_0001",
      decision: "request_revision",
      message: "revise",
      reference_files: [],
    });
    expect(() => parseDelegateTaskInput({ target: { kind: "member", name: "worker" }, description: "Do it", status: "done" })).toThrow(/Unrecognized key/);
    expect(() => parseDelegateTaskInput({ member_name: "worker", description: "Do it" })).toThrow(/Unrecognized key/);
    expect(() => parseDelegateTaskInput({ tasks: [{ target: { kind: "member", name: "worker" }, description: "Do it" }] })).toThrow(/Unrecognized key/);
    expect(() => parseSubmitTaskResultInput({ task_id: "task_0001", message: "done" })).toThrow(/Unrecognized key/);
    expect(() => parseSubmitTaskResultInput({ message: "done", status: "done" })).toThrow(/Unrecognized key/);
    expect(() => parseReviewTaskResultInput({ task_id: "task_0001", decision: "request_revision" })).toThrow(/message is required/);
    expect(() => parseReviewTaskResultInput({ task_id: "task_0001", decision: "accept", submission_id: "sub" })).toThrow(/Unrecognized key/);
  });
});
