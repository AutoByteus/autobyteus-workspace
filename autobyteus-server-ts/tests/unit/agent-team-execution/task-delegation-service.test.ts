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
  parseUpdateTaskStatusInput,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-input-parsers.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

class FakeTeamRunBackend implements TeamRunBackend {
  readonly runId = "team-run-1";
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly messages: Array<{ content: string; target: TeamMemberSelector | null | undefined }> = [];
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
  ): Promise<AgentOperationResult> {
    this.messages.push({ content: message.content, target });
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
) => {
  const identity = findTaskAgentIdentity(backend, taskId);
  return buildContext({
    ...worker,
    memberRunId: identity.taskAgentRunId,
    taskAgentInstanceId: identity.taskAgentInstanceId,
    taskAgentRunId: identity.taskAgentRunId,
    taskId: identity.taskId,
    logicalMemberRouteKey: identity.logicalMember.memberRouteKey,
  });
};

const publishIdleEvent = (
  backend: FakeTeamRunBackend,
  taskId: string,
): void => {
  const identity = findTaskAgentIdentity(backend, taskId);
  backend.publishEvent({
    eventSourceType: TeamRunEventSourceType.AGENT,
    teamRunId: backend.runId,
    sourcePath: worker.memberPath,
    data: {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberName: worker.memberName,
      memberRunId: identity.taskAgentRunId,
      memberPath: worker.memberPath,
      memberRouteKey: worker.memberRouteKey,
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
      parseUpdateTaskStatusInput({
        task_id: "task_0002",
        status: "in_progress",
        message: "Selectors are not accepted.",
      }),
    ).toThrow(/Unrecognized key/);

    const progressUpdate = await service.updateTaskStatus(buildTaskAgentContext(backend, "task_0001"), {
      status: "in_progress",
      message: "Draft started.",
    });

    expect(progressUpdate).toMatchObject({
      status: "in_progress",
      terminal: false,
      message: "Draft started.",
      reference_files_count: 0,
      settlement_requested: false,
    });
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_STATUS_UPDATED")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "task_0001",
          previousStatus: "queued",
          status: "in_progress",
          message: "Draft started.",
          terminal: false,
        }),
      ]),
    );

    const firstTerminal = await service.updateTaskStatus(buildTaskAgentContext(backend, "task_0001"), {
      status: "completed",
      message: "Draft complete.",
      reference_files: ["/tmp/draft.md"],
    });

    expect(firstTerminal).toMatchObject({
      terminal: true,
      message: "Draft complete.",
      reference_files_count: 1,
      settlement_requested: true,
    });
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_STATUS_UPDATED")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "task_0001",
          previousStatus: "in_progress",
          status: "completed",
          message: "Draft complete.",
          referenceFiles: ["/tmp/draft.md"],
          terminal: true,
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
    await vi.waitFor(() => {
      expect(backend.taskAgentSettlements).toEqual([
        expect.objectContaining({
          routeKey: "worker",
          runId: findTaskAgentIdentity(backend, "task_0001").taskAgentRunId,
        }),
      ]);
    });

    const secondTerminal = await service.updateTaskStatus(buildTaskAgentContext(backend, "task_0002"), {
      status: "completed",
      message: "Polish complete.",
      reference_files: ["/tmp/final.md"],
    });

    expect(secondTerminal).toMatchObject({
      terminal: true,
      message: "Polish complete.",
      reference_files_count: 1,
      settlement_requested: true,
    });
    expect(backend.settlements).toEqual([]);
    expect(backend.taskAgentSettlements).toHaveLength(1);

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
      service.updateTaskStatus(buildContext(worker), {
        status: "in_progress",
        message: "Rejected activation is not mutable.",
      }),
    ).rejects.toMatchObject({ code: "TASK_AGENT_NOT_BOUND" });

    const terminal = await service.updateTaskStatus(buildTaskAgentContext(backend, "task_0001"), {
      status: "completed",
      message: "Draft complete.",
    });

    expect(terminal).toMatchObject({
      terminal: true,
      message: "Draft complete.",
      settlement_requested: true,
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

  it("rejects selector-free status updates from contexts not bound to a task-agent instance", async () => {
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
      service.updateTaskStatus(buildContext(coordinator), {
        status: "completed",
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
      service.updateTaskStatus(mismatchedContext, {
        status: "completed",
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

  it("rejects stale delegate_tasks and update_task_status fields that are no longer model-facing", () => {
    for (const staleField of ["task_name", "assignee_name", "dependencies", "completion_criteria", "expected_deliverables"]) {
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

    for (const staleField of ["task_id", "task_name", "summary", "deliverables"]) {
      expect(() =>
        parseUpdateTaskStatusInput({
          status: "completed",
          message: "Done.",
          [staleField]: staleField === "deliverables" ? [] : "stale",
        }),
      ).toThrow(/Unrecognized key/);
    }

    expect(parseUpdateTaskStatusInput({
      status: "completed",
      message: "Done.",
      reference_files: ["/tmp/result.md"],
    })).toEqual({
      status: "completed",
      message: "Done.",
      reference_files: ["/tmp/result.md"],
    });
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
