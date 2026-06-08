import { afterEach, describe, expect, it } from "vitest";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { InterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import type {
  StartTaskAgentInstanceRequest,
} from "../../../src/agent-team-execution/domain/task-agent-instance.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
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
  parseAcceptTaskInput,
  parseDelegateTasksInput,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-input-parsers.js";
import { TASK_DELEGATION_TOOL_NAME_LIST } from "../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

class FakeTeamRunBackend implements TeamRunBackend {
  readonly runId = "team-run-1";
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly taskAgentStarts: StartTaskAgentInstanceRequest[] = [];
  readonly taskAgentSettlements: Array<{ routeKey: string; runId: string; reason: string | null | undefined }> = [];
  readonly publishedEvents: TeamRunEvent[] = [];
  taskAgentStartResults: AgentOperationResult[] = [];
  taskAgentStartError: Error | null = null;
  private readonly listeners = new Set<TeamRunEventListener>();

  getRuntimeContext() { return null; }
  isActive(): boolean { return true; }
  getStatusSnapshot() { return { status: "running" as const, source_path: [] }; }
  getMemberStatusSnapshots() { return []; }
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  async postMessage(_message: AgentInputUserMessage, _target?: TeamMemberSelector | null, _targetMemberRunId?: string | null): Promise<AgentOperationResult> { return { accepted: true }; }
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

afterEach(() => {
  disposeTaskAgentDirectory("team-run-1");
});

describe("TaskDelegationService", () => {
  it("delegates active work with target_agent_run_id and no result-tool work-packet protocol", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));

    const created = await service.delegateTasks(buildContext(), {
      tasks: [
        { member_name: "worker", description: "Draft the implementation note.", reference_files: ["/tmp/source.md"] },
        { member_name: "worker", description: "Review the tests." },
      ],
    });

    expect(created.createdTasks).toEqual([
      expect.objectContaining({ member_name: "worker", task_id: "task_0001", target_agent_run_id: "team-run-1__worker__task_0001", status: "active" }),
      expect.objectContaining({ member_name: "worker", task_id: "task_0002", target_agent_run_id: "team-run-1__worker__task_0002", status: "active" }),
    ]);
    expect(created.activationResults.map((result) => result.target_agent_run_id)).toEqual([
      "team-run-1__worker__task_0001",
      "team-run-1__worker__task_0002",
    ]);
    expect(backend.taskAgentStarts).toHaveLength(2);
    expect(backend.taskAgentStarts[0]!.message.content).toContain("Your target_agent_run_id: team-run-1__worker__task_0001");
    expect(backend.taskAgentStarts[0]!.message.content).toContain("Delegator reply recipient_name: coordinator");
    expect(backend.taskAgentStarts[0]!.message.content).not.toContain(["mark", "task", "completed"].join("_"));

    const activated = taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED") as Array<{ tasks: Array<{ targetAgentRunId: string; status: string }> }>;
    expect(activated).toHaveLength(2);
    expect(activated[0]!.tasks[0]).toMatchObject({ targetAgentRunId: "team-run-1__worker__task_0001", status: "active" });
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("team-run-1__worker__task_0001")?.taskId).toBe("task_0001");
  });

  it("renders ordinary delegator reply selector with visible roster name, not route key", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));
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
      "Delegator reply recipient_name: Lead Coordinator",
    );
    expect(backend.taskAgentStarts[0]!.message.content).not.toContain(
      "Delegator reply recipient_name: coordinator",
    );
  });

  it("accepts active tasks only by original delegator, settles after idle, and invalidates the exact run target", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));
    await service.delegateTasks(buildContext(), { tasks: [{ member_name: "worker", description: "Do work." }] });

    await expect(
      service.acceptTask(buildContext(worker), { task_id: "task_0001" }),
    ).rejects.toMatchObject({ code: "DELEGATOR_NOT_AUTHORIZED" });

    const accepted = await service.acceptTask(buildContext(), { task_id: "task_0001", message: "Accepted" });
    expect(accepted).toMatchObject({ status: "accepted", terminal: true, message: "Accepted", settlement_requested: true });
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("team-run-1__worker__task_0001")).toBeNull();

    publishIdleEvent(backend, "task_0001");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(backend.taskAgentSettlements).toEqual([
      expect.objectContaining({ routeKey: "worker", runId: "team-run-1__worker__task_0001" }),
    ]);
  });

  it("keeps rejected activations not_started and does not publish active exact-run targets", async () => {
    const backend = new FakeTeamRunBackend();
    backend.taskAgentStartResults = [{ accepted: false, code: "REJECTED", message: "No" }];
    const service = new TaskDelegationService(new TeamRun({ backend }));

    const created = await service.delegateTasks(buildContext(), {
      tasks: [{ member_name: "worker", description: "Cannot start." }],
    });

    expect(created.createdTasks).toEqual([
      expect.objectContaining({ member_name: "worker", task_id: "task_0001", status: "not_started", target_agent_run_id: null }),
    ]);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toEqual([]);
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("team-run-1__worker__task_0001")).toBeNull();
  });

  it("rolls back task-agent directory and ledger state when activation throws", async () => {
    const backend = new FakeTeamRunBackend();
    backend.taskAgentStartError = new Error("task-agent post failed");
    const service = new TaskDelegationService(new TeamRun({ backend }));

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
    expect(getTaskAgentDirectory("team-run-1").resolveTaskAgentRunId("team-run-1__worker__task_0001")).toBeNull();
  });

  it("supports task-agent delegators with taskAgentRunId/taskId identity but not model-facing instance identity", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));
    await service.delegateTasks(buildContext(), { tasks: [{ member_name: "worker", description: "Parent task." }] });
    const parent = backend.taskAgentStarts[0]!.identity;
    const parentCaller = {
      ...worker,
      memberRunId: parent.taskAgentRunId,
      taskAgentRunId: parent.taskAgentRunId,
      taskId: parent.taskId,
      logicalMemberRouteKey: parent.logicalMember.memberRouteKey,
    };

    const child = await service.delegateTasks(buildContext(parentCaller), {
      tasks: [{ member_name: "worker", description: "Nested child task." }],
    });
    expect(child.createdTasks[0]).toMatchObject({ task_id: "task_0002", status: "active" });
    expect(backend.taskAgentStarts[1]!.message.content).toContain("Delegator reply target_agent_run_id: team-run-1__worker__task_0001");

    await expect(
      service.acceptTask(buildContext({ ...parentCaller, taskId: "wrong" }), { task_id: "task_0002" }),
    ).rejects.toMatchObject({ code: "DELEGATOR_NOT_AUTHORIZED" });
    await expect(
      service.acceptTask(buildContext(parentCaller), { task_id: "task_0002" }),
    ).resolves.toMatchObject({ status: "accepted" });
  });

  it("exposes only delegate_tasks and accept_task parsers/tools", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual(["delegate_tasks", "accept_task"]);
    expect(parseDelegateTasksInput({ tasks: [{ member_name: "worker", description: "Do it" }] })).toEqual({
      tasks: [{ member_name: "worker", description: "Do it", reference_files: [] }],
    });
    expect(parseAcceptTaskInput({ task_id: "task_0001", message: "ok" })).toEqual({
      task_id: "task_0001",
      message: "ok",
    });
    expect(() => parseDelegateTasksInput({ tasks: [{ member_name: "worker", description: "Do it", status: "done" }] })).toThrow(/Unrecognized key/);
    expect(() => parseAcceptTaskInput({ task_id: "task_0001", reference_files: [] })).toThrow(/Unrecognized key/);
  });
});
