import { describe, expect, it, vi } from "vitest";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { InterAgentMessageDeliveryRequest } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
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
import { TaskDelegationError } from "../../../src/agent-team-execution/task-delegation/task-delegation-record.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

class FakeTeamRunBackend implements TeamRunBackend {
  readonly runId = "team-run-1";
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly messages: Array<{ content: string; target: TeamMemberSelector | null | undefined }> = [];
  readonly publishedEvents: TeamRunEvent[] = [];
  readonly settlements: Array<{ routeKey: string; runId: string | null | undefined; reason: string | null | undefined }> = [];
  postMessageResult: AgentOperationResult = { accepted: true };
  postMessageResults: AgentOperationResult[] = [];
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

const publishIdleEvent = (backend: FakeTeamRunBackend): void => {
  backend.publishEvent({
    eventSourceType: TeamRunEventSourceType.AGENT,
    teamRunId: backend.runId,
    sourcePath: worker.memberPath,
    data: {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberName: worker.memberName,
      memberRunId: worker.memberRunId,
      memberPath: worker.memberPath,
      memberRouteKey: worker.memberRouteKey,
      agentEvent: {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: worker.memberRunId,
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
  it("delegates runnable work, activates dependencies after completion, notifies the delegator, and settles after idle", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));

    const created = await service.delegateTasks(buildContext(), {
      tasks: [
        {
          task_name: "draft",
          assignee_name: "worker",
          description: "Draft the implementation note.",
          dependencies: [],
          completion_criteria: "Note is complete.",
          expected_deliverables: ["draft.md"],
        },
        {
          task_name: "polish",
          assignee_name: "worker",
          description: "Polish the implementation note.",
          dependencies: ["draft"],
          completion_criteria: "Note is polished.",
          expected_deliverables: ["final.md"],
        },
      ],
    });

    expect(created.createdTasks.map((task) => task.task_id)).toEqual(["task_0001", "task_0002"]);
    expect(created.createdTasks.map((task) => task.status)).toEqual(["queued", "not_started"]);
    expect(created.createdTasks[1].dependency_task_ids).toEqual(["task_0001"]);
    expect(created.activationResults.map((result) => result.taskIds)).toEqual([["task_0001"]]);
    expect(backend.messages[0]).toMatchObject({
      target: { kind: "route_key", memberRouteKey: "worker" },
    });
    expect(backend.messages[0].content).toContain('Use task_id="task_0001"');
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toEqual([
      expect.objectContaining({
        assignee: expect.objectContaining({ memberRouteKey: "worker" }),
        taskIds: ["task_0001"],
        tasks: [
          expect.objectContaining({
            taskId: "task_0001",
            status: "queued",
            dependencyTaskIds: [],
          }),
        ],
      }),
    ]);

    await expect(
      service.updateTaskStatus(buildContext(worker), {
        task_id: "task_0002",
        status: "in_progress",
        summary: "This task has not been activated yet.",
        deliverables: [],
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });

    const progressUpdate = await service.updateTaskStatus(buildContext(worker), {
      task_id: "task_0001",
      status: "in_progress",
      summary: "Draft started.",
      deliverables: [],
    });

    expect(progressUpdate).toMatchObject({
      task_id: "task_0001",
      status: "in_progress",
      terminal: false,
      activated_task_ids: [],
      settlement_requested: false,
    });
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_STATUS_UPDATED")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "task_0001",
          previousStatus: "queued",
          status: "in_progress",
          summary: "Draft started.",
          terminal: false,
        }),
      ]),
    );

    const firstTerminal = await service.updateTaskStatus(buildContext(worker), {
      task_id: "task_0001",
      status: "completed",
      summary: "Draft complete.",
      deliverables: [{ file_path: "/tmp/draft.md", summary: "Draft note" }],
    });

    expect(firstTerminal).toMatchObject({
      task_id: "task_0001",
      terminal: true,
      activated_task_ids: ["task_0002"],
      settlement_requested: false,
    });
    expect(backend.messages.some((message) => message.content.includes('Use task_id="task_0002"'))).toBe(true);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_STATUS_UPDATED")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "task_0001",
          previousStatus: "in_progress",
          status: "completed",
          terminal: true,
        }),
      ]),
    );
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ taskIds: ["task_0002"] }),
      ]),
    );
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_TERMINAL_STATUS")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "task_0001",
          status: "completed",
          activatedTaskIds: ["task_0002"],
        }),
      ]),
    );

    const secondTerminal = await service.updateTaskStatus(buildContext(worker), {
      task_id: "task_0002",
      status: "completed",
      summary: "Polish complete.",
      deliverables: [{ file_path: "/tmp/final.md", summary: "Final note" }],
    });

    expect(secondTerminal).toMatchObject({
      task_id: "task_0002",
      terminal: true,
      activated_task_ids: [],
      settlement_requested: true,
    });
    expect(backend.settlements).toEqual([]);

    publishIdleEvent(backend);
    await vi.waitFor(() => {
      expect(backend.settlements).toEqual([
        expect.objectContaining({ routeKey: "worker", runId: "run-worker" }),
      ]);
    });
    service.dispose();
  });

  it("does not report rejected dependency activations as activated work", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));

    await service.delegateTasks(buildContext(), {
      tasks: [
        {
          task_name: "draft",
          assignee_name: "worker",
          description: "Draft the implementation note.",
          dependencies: [],
          expected_deliverables: [],
        },
        {
          task_name: "polish",
          assignee_name: "worker",
          description: "Polish the implementation note.",
          dependencies: ["draft"],
          expected_deliverables: [],
        },
      ],
    });

    backend.postMessageResults = [
      {
        accepted: false,
        message: "worker is not accepting new work",
      },
      { accepted: true },
    ];

    const terminal = await service.updateTaskStatus(buildContext(worker), {
      task_id: "task_0001",
      status: "completed",
      summary: "Draft complete.",
      deliverables: [],
    });

    expect(terminal).toMatchObject({
      task_id: "task_0001",
      terminal: true,
      activated_task_ids: [],
      settlement_requested: false,
    });
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(1);
    expect(taskDelegationPayloads(backend, "TASK_DELEGATION_TERMINAL_STATUS")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "task_0001",
          activatedTaskIds: [],
        }),
      ]),
    );
    service.dispose();
  });

  it("rejects assignee updates from non-assignees", async () => {
    const backend = new FakeTeamRunBackend();
    const service = new TaskDelegationService(new TeamRun({ backend }));

    await service.delegateTasks(buildContext(), {
      tasks: [
        {
          task_name: "draft",
          assignee_name: "worker",
          description: "Draft the implementation note.",
          dependencies: [],
          expected_deliverables: [],
        },
      ],
    });

    await expect(
      service.updateTaskStatus(buildContext(coordinator), {
        task_id: "task_0001",
        status: "completed",
        summary: "Not my task.",
        deliverables: [],
      }),
    ).rejects.toMatchObject({ code: "ASSIGNEE_MISMATCH" });
    service.dispose();
  });

  it("rejects ambiguous assignee names and accepts unique route keys", async () => {
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
            task_name: "ambiguous",
            assignee_name: "worker",
            description: "This should fail.",
            dependencies: [],
            expected_deliverables: [],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(TaskDelegationError);

    await expect(
      service.delegateTasks(buildContext(coordinator, [coordinator, worker, duplicateWorker]), {
        tasks: [
          {
            task_name: "routed",
            assignee_name: "nested/worker",
            description: "This should route by exact route key.",
            dependencies: [],
            expected_deliverables: [],
          },
        ],
      }),
    ).resolves.toMatchObject({
      createdTasks: [expect.objectContaining({ task_id: "task_0001", assignee_name: "worker" })],
    });
    service.dispose();
  });
});
