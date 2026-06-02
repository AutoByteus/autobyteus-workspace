import { describe, expect, it, vi } from "vitest";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { InterAgentMessageDeliveryRequest } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import type {
  StartTaskAgentInstanceRequest,
  TaskAgentInstanceIdentity,
} from "../../../src/agent-team-execution/domain/task-agent-instance.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunTaskDelegationEventPayload,
  type TeamRunEventUnsubscribe,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import type { TeamMemberSelector } from "../../../src/agent-team-execution/domain/team-run-member-identity.js";
import { TaskDelegationService } from "../../../src/agent-team-execution/task-delegation/task-delegation-service.js";
import {
  parseDelegateTasksInput,
  parseAcceptTaskInput,
  parseMarkTaskCompletedInput,
  parseMarkTaskFailedInput,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-input-parsers.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

class FakeTeamRunBackend implements TeamRunBackend {
  readonly runId = "team-run-1";
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly messages: Array<{ content: string; target: TeamMemberSelector | null | undefined; targetMemberRunId: string | null | undefined }> = [];
  readonly taskAgentStarts: StartTaskAgentInstanceRequest[] = [];
  readonly publishedEvents: TeamRunEvent[] = [];
  readonly settlements: Array<{ routeKey: string; runId: string | null | undefined; reason: string | null | undefined }> = [];
  readonly taskAgentSettlements: Array<{ routeKey: string; runId: string; reason: string | null | undefined }> = [];
  postMessageResult: AgentOperationResult = { accepted: true };
  postMessageResults: AgentOperationResult[] = [];
  taskAgentStartResult: AgentOperationResult = { accepted: true };
  taskAgentStartResults: AgentOperationResult[] = [];
  private readonly listeners = new Set<TeamRunEventListener>();

  getRuntimeContext() {
    return null;
  }

  isActive(): boolean {
    return true;
  }

  getStatusSnapshot() {
    return { status: "running" as const, source_path: [] };
  }

  getMemberStatusSnapshots() {
    return [];
  }

  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async postMessage(
    message: AgentInputUserMessage,
    target?: TeamMemberSelector | null,
    targetMemberRunId?: string | null,
  ): Promise<AgentOperationResult> {
    this.messages.push({ content: message.content, target, targetMemberRunId });
    return this.postMessageResults.shift() ?? this.postMessageResult;
  }

  async deliverInterAgentMessage(_request: InterAgentMessageDeliveryRequest): Promise<AgentOperationResult> {
    return { accepted: true };
  }

  async approveToolInvocation(): Promise<AgentOperationResult> {
    return { accepted: true };
  }

  async interruptMember(): Promise<AgentOperationResult> {
    return { accepted: true };
  }

  async settleMember(
    targetMemberRouteKey: string,
    targetMemberRunId?: string | null,
    reason?: string | null,
  ): Promise<AgentOperationResult> {
    this.settlements.push({
      routeKey: targetMemberRouteKey,
      runId: targetMemberRunId,
      reason,
    });
    return { accepted: true };
  }

  async startTaskAgentInstance(
    request: StartTaskAgentInstanceRequest,
  ): Promise<AgentOperationResult> {
    this.taskAgentStarts.push(request);
    return this.taskAgentStartResults.shift() ?? this.taskAgentStartResult;
  }

  async settleTaskAgentInstance(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    reason?: string | null,
  ): Promise<AgentOperationResult> {
    this.taskAgentSettlements.push({
      routeKey: logicalMemberRouteKey,
      runId: taskAgentRunId,
      reason,
    });
    return { accepted: true };
  }

  async terminate(): Promise<AgentOperationResult> {
    return { accepted: true };
  }

  publishEvent(event: TeamRunEvent): void {
    this.publishedEvents.push(event);
    for (const listener of this.listeners) {
      listener(event);
    }
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

const reviewer = {
  memberName: "reviewer",
  memberPath: ["reviewer"],
  memberRouteKey: "reviewer",
  memberRunId: "run-reviewer",
};

const buildContext = (caller = coordinator, members = [coordinator, worker]) => ({
  teamRunId: "team-run-1",
  teamDefinitionId: "team-def-1",
  teamName: "Task Team",
  caller,
  coordinatorMemberRouteKey: coordinator.memberRouteKey,
  members,
});

const findTaskAgentIdentity = (
  backend: FakeTeamRunBackend,
  taskId: string,
): TaskAgentInstanceIdentity => {
  const identity = backend.taskAgentStarts.find(
    (start) => start.identity.taskId === taskId,
  )?.identity;
  if (!identity) {
    throw new Error(`Missing task-agent identity for ${taskId}.`);
  }
  return identity;
};

const buildTaskAgentContext = (
  backend: FakeTeamRunBackend,
  taskId: string,
  members = [coordinator, worker],
) => {
  const identity = findTaskAgentIdentity(backend, taskId);
  return buildContext({
    ...worker,
    memberRunId: identity.taskAgentRunId,
    taskAgentInstanceId: identity.taskAgentInstanceId,
    taskAgentRunId: identity.taskAgentRunId,
    taskId: identity.taskId,
    logicalMemberRouteKey: identity.logicalMember.memberRouteKey,
  }, members);
};

const publishIdleEvent = (
  backend: FakeTeamRunBackend,
  taskId: string,
): void => {
  const identity = findTaskAgentIdentity(backend, taskId);
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

describe("TaskDelegationService", () => {
  it("delegates independent work, starts one task-agent per task, notifies the delegator, and settles each instance after idle", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));

    const created = await service.delegateTasks(buildContext(), {
      tasks: [
        {
          member_name: "worker",
          description: "Draft the implementation note. Done when draft.md content is summarized.",
          reference_files: ["/tmp/source.md"],
        },
        {
          member_name: "worker",
          description: "Polish the implementation note independently. Done when final.md content is summarized.",
        },
      ],
    });

    expect(created.createdTasks).toEqual([
      expect.objectContaining({ member_name: "worker", status: "queued" }),
      expect.objectContaining({ member_name: "worker", status: "queued" }),
    ]);
    expect(created.activationResults).toEqual([
      expect.objectContaining({ memberName: "worker", taskCount: 1, accepted: true }),
      expect.objectContaining({ memberName: "worker", taskCount: 1, accepted: true }),
    ]);
    expect(backend.taskAgentStarts).toHaveLength(2);
    expect(backend.taskAgentStarts[0].identity).toMatchObject({
      taskAgentInstanceId: "task_agent_task_0001",
      taskId: "task_0001",
      logicalMember: expect.objectContaining({ memberRouteKey: "worker" }),
    });
    expect(backend.taskAgentStarts[0].message.content).not.toContain('Use task_id=');
    expect(backend.taskAgentStarts[0].message.content).toContain("Do not pass task_id or task_name");
    expect(backend.taskAgentStarts[0].message.content).toContain("Task-agent instance: task_agent_task_0001");
    expect(backend.taskAgentStarts[0].message.content).toContain("Draft the implementation note.");
    expect(backend.taskAgentStarts[0].message.content).toContain("/tmp/source.md");
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toEqual([
      expect.objectContaining({
        member: expect.objectContaining({ memberRouteKey: "worker" }),
        taskAgentInstance: expect.objectContaining({ taskId: "task_0001" }),
        taskIds: ["task_0001"],
        tasks: [
          expect.objectContaining({
            taskId: "task_0001",
            taskLabel: expect.stringContaining("Draft"),
            status: "queued",
          }),
        ],
      }),
      expect.objectContaining({
        member: expect.objectContaining({ memberRouteKey: "worker" }),
        taskAgentInstance: expect.objectContaining({ taskId: "task_0002" }),
        taskIds: ["task_0002"],
        tasks: [
          expect.objectContaining({
            taskId: "task_0002",
            taskLabel: expect.stringContaining("Polish"),
            status: "queued",
          }),
        ],
      }),
    ]);

    await expect(() =>
      parseMarkTaskCompletedInput({
        task_id: "task_0002",
        message: "Selectors are not accepted.",
      }),
    ).toThrow(/Unrecognized key/);

    const firstCompletion = await service.markTaskCompleted(buildTaskAgentContext(backend, "task_0001"), {
      message: "Draft complete.",
      reference_files: ["/tmp/draft.md"],
    });

    expect(firstCompletion).toMatchObject({
      status: "awaiting_acceptance",
      terminal: false,
      message: "Draft complete.",
      reference_files_count: 1,
      settlement_requested: false,
    });
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_STATUS_UPDATED")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "task_0001",
          previousStatus: "queued",
          status: "awaiting_acceptance",
          message: "Draft complete.",
          referenceFiles: ["/tmp/draft.md"],
          terminal: false,
        }),
      ]),
    );
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_TERMINAL_STATUS")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "task_0001",
          status: "completed",
          message: "Draft complete.",
          referenceFiles: ["/tmp/draft.md"],
        }),
      ]),
    );

    publishIdleEvent(backend, "task_0001");
    expect(backend.taskAgentSettlements).toEqual([]);

    const firstAccepted = await service.acceptTask(buildContext(), {
      task_id: "task_0001",
      message: "Draft accepted.",
    });
    expect(firstAccepted).toMatchObject({
      status: "accepted",
      terminal: true,
      message: "Draft accepted.",
      settlement_requested: true,
    });
    await vi.waitFor(() => {
      expect(backend.taskAgentSettlements).toEqual([
        expect.objectContaining({
          routeKey: "worker",
          runId: findTaskAgentIdentity(backend, "task_0001").taskAgentRunId,
        }),
      ]);
    });

    const secondCompletion = await service.markTaskCompleted(buildTaskAgentContext(backend, "task_0002"), {
      message: "Polish complete.",
      reference_files: ["/tmp/final.md"],
    });

    expect(secondCompletion).toMatchObject({
      status: "awaiting_acceptance",
      terminal: false,
      message: "Polish complete.",
      reference_files_count: 1,
      settlement_requested: false,
    });
    expect(backend.settlements).toEqual([]);
    expect(backend.taskAgentSettlements).toHaveLength(1);

    const secondAccepted = await service.acceptTask(buildContext(), {
      task_id: "task_0002",
    });
    expect(secondAccepted).toMatchObject({
      status: "accepted",
      terminal: true,
      settlement_requested: true,
    });

    publishIdleEvent(backend, "task_0002");
    await vi.waitFor(() => {
      expect(backend.taskAgentSettlements).toEqual([
        expect.objectContaining({
          routeKey: "worker",
          runId: findTaskAgentIdentity(backend, "task_0001").taskAgentRunId,
        }),
        expect.objectContaining({
          routeKey: "worker",
          runId: findTaskAgentIdentity(backend, "task_0002").taskAgentRunId,
        }),
      ]);
    });
    service.dispose();
  });

  it("captures a task-agent delegator identity and routes child completion to the original task-agent with coordinator fallback", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));
    const members = [coordinator, worker, reviewer];

    await service.delegateTasks(buildContext(coordinator, members), {
      tasks: [{ member_name: "worker", description: "Parent task that may delegate child work." }],
    });
    const parentTaskAgent = findTaskAgentIdentity(backend, "task_0001");

    await service.delegateTasks(buildTaskAgentContext(backend, "task_0001", members), {
      tasks: [{ member_name: "reviewer", description: "Child review task delegated by a worker task-agent." }],
    });
    expect(backend.taskAgentStarts).toHaveLength(2);
    expect(backend.taskAgentStarts[1].message.content).toContain(
      `Delegator task-agent run: ${parentTaskAgent.taskAgentRunId}`,
    );

    const childTaskAgent = findTaskAgentIdentity(backend, "task_0002");
    await service.markTaskCompleted(buildContext({
      ...reviewer,
      memberRunId: childTaskAgent.taskAgentRunId,
      taskAgentInstanceId: childTaskAgent.taskAgentInstanceId,
      taskAgentRunId: childTaskAgent.taskAgentRunId,
      taskId: childTaskAgent.taskId,
      logicalMemberRouteKey: childTaskAgent.logicalMember.memberRouteKey,
    }, members), {
      message: "Child review complete.",
    });

    const terminalPayload = taskDelegationPayloads(backend, "TASK_DELEGATION_TERMINAL_STATUS")[0] as Record<string, unknown>;
    expect(terminalPayload).toMatchObject({
      taskId: "task_0002",
      delegator: expect.objectContaining({
        memberRouteKey: "worker",
        memberRunId: parentTaskAgent.taskAgentRunId,
        taskAgentInstanceId: parentTaskAgent.taskAgentInstanceId,
        taskAgentRunId: parentTaskAgent.taskAgentRunId,
        taskId: "task_0001",
        logicalMemberRouteKey: "worker",
      }),
    });
    expect(backend.messages).toEqual([
      expect.objectContaining({
        target: expect.objectContaining({ memberRouteKey: "worker" }),
        targetMemberRunId: parentTaskAgent.taskAgentRunId,
        content: expect.stringContaining("Child review complete."),
      }),
      expect.objectContaining({
        target: expect.objectContaining({ memberRouteKey: "coordinator" }),
        targetMemberRunId: null,
        content: expect.stringContaining("Child review complete."),
      }),
    ]);
    const accepted = await service.acceptTask(buildTaskAgentContext(backend, "task_0001", members), {
      task_id: "task_0002",
    });
    expect(accepted).toMatchObject({ status: "accepted", terminal: true, settlement_requested: true });

    publishIdleEvent(backend, "task_0002");
    await vi.waitFor(() => {
      expect(backend.taskAgentSettlements).toEqual([
        expect.objectContaining({
          routeKey: "reviewer",
          runId: childTaskAgent.taskAgentRunId,
        }),
      ]);
    });
    service.dispose();
  });

  it("keeps completed task-agents addressable for revision and settles only after original-delegator acceptance", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));
    const members = [coordinator, worker, reviewer];

    await service.delegateTasks(buildContext(coordinator, members), {
      tasks: [{ member_name: "worker", description: "Prepare a report that may need revision." }],
    });

    await service.markTaskCompleted(buildTaskAgentContext(backend, "task_0001", members), {
      message: "Report ready for review.",
      reference_files: ["/tmp/report.md"],
    });

    expect(backend.taskAgentSettlements).toEqual([]);
    await expect(
      service.acceptTask(buildContext(reviewer, members), {
        task_id: "task_0001",
      }),
    ).rejects.toMatchObject({ code: "DELEGATOR_NOT_AUTHORIZED" });

    const revisedCompletion = await service.markTaskCompleted(buildTaskAgentContext(backend, "task_0001", members), {
      message: "Revised report ready.",
      reference_files: ["/tmp/report-v2.md"],
    });
    expect(revisedCompletion).toMatchObject({
      status: "awaiting_acceptance",
      terminal: false,
      reference_files_count: 2,
      settlement_requested: false,
    });

    const accepted = await service.acceptTask(buildContext(coordinator, members), {
      task_id: "task_0001",
    });
    expect(accepted).toMatchObject({ status: "accepted", terminal: true, settlement_requested: true });

    await expect(
      service.markTaskCompleted(buildTaskAgentContext(backend, "task_0001", members), {
        message: "Too late.",
      }),
    ).rejects.toMatchObject({ code: "TASK_ALREADY_TERMINAL" });

    publishIdleEvent(backend, "task_0001");
    await vi.waitFor(() => {
      expect(backend.taskAgentSettlements).toHaveLength(1);
    });
    service.dispose();
  });

  it("treats failed reports as failure-terminal and settles after idle without acceptance", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));

    await service.delegateTasks(buildContext(), {
      tasks: [{ member_name: "worker", description: "Attempt a risky task." }],
    });

    const failed = await service.markTaskFailed(buildTaskAgentContext(backend, "task_0001"), {
      message: "Blocked by missing credentials.",
    });
    expect(failed).toMatchObject({
      status: "failed",
      terminal: true,
      settlement_requested: true,
    });

    await expect(
      service.acceptTask(buildContext(), {
        task_id: "task_0001",
      }),
    ).rejects.toMatchObject({ code: "TASK_NOT_AWAITING_ACCEPTANCE" });

    publishIdleEvent(backend, "task_0001");
    await vi.waitFor(() => {
      expect(backend.taskAgentSettlements).toHaveLength(1);
    });
    service.dispose();
  });

  it("does not report rejected task-agent activations as queued work", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));

    backend.taskAgentStartResults = [
      { accepted: true },
      {
        accepted: false,
        message: "worker is not accepting new work",
      },
    ];

    const created = await service.delegateTasks(buildContext(), {
      tasks: [
        {
          member_name: "worker",
          description: "Draft the implementation note.",
        },
        {
          member_name: "worker",
          description: "Polish the implementation note.",
        },
      ],
    });

    expect(created.createdTasks.map((task) => task.status)).toEqual(["queued", "not_started"]);
    expect(created.activationResults).toEqual([
      expect.objectContaining({ accepted: true, memberName: "worker", taskCount: 1 }),
      expect.objectContaining({ accepted: false, memberName: "worker", taskCount: 1, message: "worker is not accepting new work" }),
    ]);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(1);

    await expect(
      service.markTaskCompleted(buildContext(worker), {
        message: "Rejected activation is not mutable.",
      }),
    ).rejects.toMatchObject({ code: "TASK_AGENT_NOT_BOUND" });

    const completion = await service.markTaskCompleted(buildTaskAgentContext(backend, "task_0001"), {
      message: "Draft complete.",
    });

    expect(completion).toMatchObject({
      status: "awaiting_acceptance",
      terminal: false,
      message: "Draft complete.",
      settlement_requested: false,
    });
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(1);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_TERMINAL_STATUS")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "task_0001",
          message: "Draft complete.",
        }),
      ]),
    );
    service.dispose();
  });

  it("rejects unrostered or inconsistent delegator contexts before ledger mutation", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));

    await expect(
      service.delegateTasks(buildContext({
        memberName: "intruder",
        memberPath: ["intruder"],
        memberRouteKey: "intruder",
        memberRunId: "run-intruder",
      }, [coordinator, worker]), {
        tasks: [{ member_name: "worker", description: "Spoofed delegation should fail." }],
      }),
    ).rejects.toMatchObject({ code: "DELEGATOR_NOT_AUTHORIZED" });

    await expect(
      service.delegateTasks(buildContext({
        ...worker,
        memberRunId: "not-the-task-agent-run",
        taskAgentInstanceId: "task_agent_task_9999",
        taskAgentRunId: "task-agent-run-9999",
        taskId: "task_9999",
        logicalMemberRouteKey: "worker",
      }, [coordinator, worker]), {
        tasks: [{ member_name: "worker", description: "Inconsistent task-agent identity should fail." }],
      }),
    ).rejects.toMatchObject({ code: "DELEGATOR_NOT_AUTHORIZED" });

    expect(backend.taskAgentStarts).toHaveLength(0);
    service.dispose();
  });

  it("rejects selector-free result reports from contexts not bound to a task-agent instance", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));

    await service.delegateTasks(buildContext(), {
      tasks: [
        {
          member_name: "worker",
          description: "Draft the implementation note.",
        },
      ],
    });

    await expect(
      service.markTaskCompleted(buildContext(coordinator), {
        message: "Not my task.",
      }),
    ).rejects.toMatchObject({ code: "TASK_AGENT_NOT_BOUND" });
    service.dispose();
  });

  it("rejects task-agent contexts whose internal binding conflicts with the bound task", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));

    await service.delegateTasks(buildContext(), {
      tasks: [
        {
          member_name: "worker",
          description: "Draft the implementation note.",
        },
        {
          member_name: "worker",
          description: "Polish the implementation note.",
        },
      ],
    });

    const mismatchedContext = buildTaskAgentContext(backend, "task_0001");
    mismatchedContext.caller.taskId = "task_0002";
    await expect(
      service.markTaskCompleted(mismatchedContext, {
        message: "Internal context mismatch.",
      }),
    ).rejects.toMatchObject({ code: "TASK_AGENT_MISMATCH" });
    service.dispose();
  });

  it("starts one distinct task-agent instance for each independent same-member task", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));

    const created = await service.delegateTasks(buildContext(), {
      tasks: [
        {
          member_name: "worker",
          description: "Draft the first independent note.",
        },
        {
          member_name: "worker",
          description: "Draft the second independent note.",
        },
      ],
    });

    expect(created.createdTasks.map((task) => task.status)).toEqual(["queued", "queued"]);
    expect(backend.taskAgentStarts).toHaveLength(2);
    expect(backend.taskAgentStarts.map((start) => start.identity.taskId)).toEqual([
      "task_0001",
      "task_0002",
    ]);
    expect(new Set(backend.taskAgentStarts.map((start) => start.identity.taskAgentRunId)).size).toBe(2);
    expect(backend.taskAgentStarts[0].message.content).toContain("Draft the first independent note.");
    expect(backend.taskAgentStarts[1].message.content).toContain("Draft the second independent note.");
    service.dispose();
  });

  it("rejects target-only delegate_tasks input before service ledger mutation", () => {
    expect(() =>
      parseDelegateTasksInput({
        tasks: [
          {
            member_name: "worker",
          },
        ],
      }),
    ).toThrow(/description|expected string/);

    expect(() =>
      parseDelegateTasksInput({
        tasks: [
          {
            member_name: "worker",
            description: "   ",
          },
        ],
      }),
    ).toThrow(/description is required/);
  });

  it("rejects stale delegate_tasks and generic status fields that are no longer model-facing", () => {
    for (const staleField of ["task_name", "assignee_name", "delegator", "dependencies", "completion_criteria", "expected_deliverables"]) {
      expect(() =>
        parseDelegateTasksInput({
          tasks: [
            {
              member_name: "worker",
              description: "All work-packet details must live in description.",
              [staleField]: staleField === "completion_criteria" ? "done" : [],
            },
          ],
        }),
      ).toThrow(/Unrecognized key/);
    }

    for (const staleField of ["status", "task_id", "task_name", "summary", "deliverables"]) {
      expect(() =>
        parseMarkTaskCompletedInput({
          message: "Done.",
          [staleField]: staleField === "deliverables" ? [] : "stale",
        }),
      ).toThrow(/Unrecognized key/);
      expect(() =>
        parseMarkTaskFailedInput({
          message: "Blocked.",
          [staleField]: staleField === "deliverables" ? [] : "stale",
        }),
      ).toThrow(/Unrecognized key/);
    }

    expect(parseMarkTaskCompletedInput({
      message: "Done.",
      reference_files: ["/tmp/result.md"],
    })).toEqual({
      message: "Done.",
      reference_files: ["/tmp/result.md"],
    });

    expect(parseMarkTaskFailedInput({
      message: "Blocked.",
      reference_files: ["/tmp/failure.md"],
    })).toEqual({
      message: "Blocked.",
      reference_files: ["/tmp/failure.md"],
    });

    expect(parseAcceptTaskInput({
      task_id: "task_0001",
      message: "Accepted.",
    })).toEqual({
      task_id: "task_0001",
      message: "Accepted.",
    });

    expect(() =>
      parseAcceptTaskInput({
        task_id: "   ",
      }),
    ).toThrow(/task_id is required/);
    expect(() =>
      parseAcceptTaskInput({
        task_id: "task_0001",
        reference_files: ["/tmp/not-accepted.md"],
      }),
    ).toThrow(/Unrecognized key/);
    expect(() =>
      parseAcceptTaskInput({
        status: "accepted",
        task_id: "task_0001",
      }),
    ).toThrow(/Unrecognized key/);
  });

  it("rejects ambiguous or missing member_name and accepts unique exact member names", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));
    const duplicateWorker = {
      ...worker,
      memberRouteKey: "nested/worker",
      memberRunId: "run-nested-worker",
    };

    await expect(
      service.delegateTasks(buildContext(coordinator, [coordinator, worker, duplicateWorker]), {
        tasks: [
          {
            member_name: "worker",
            description: "This should fail because member names are ambiguous.",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "MEMBER_AMBIGUOUS" });

    await expect(
      service.delegateTasks(buildContext(coordinator, [coordinator, worker]), {
        tasks: [
          {
            member_name: "nested/worker",
            description: "Route keys are not accepted as member_name aliases.",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "MEMBER_NOT_FOUND" });

    await expect(
      service.delegateTasks(buildContext(coordinator, [coordinator, worker]), {
        tasks: [
          {
            member_name: "worker",
            description: "This should route by exact member name.",
          },
        ],
      }),
    ).resolves.toMatchObject({
      createdTasks: [expect.objectContaining({ member_name: "worker", status: "queued" })],
    });
    service.dispose();
  });
});
