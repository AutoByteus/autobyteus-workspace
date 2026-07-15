import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { TaskDelegationSettlementCoordinator } from "../../../src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.js";

describe("TaskDelegationSettlementCoordinator", () => {
  it("settles only from canonical idle status, not a lifecycle status hint", async () => {
    let listener: ((event: TeamRunEvent) => void) | null = null;
    const settleTaskAgentInstance = vi.fn(async () => ({ accepted: true }));
    const teamRun = {
      subscribeToEvents: vi.fn((candidate) => {
        listener = candidate;
        return vi.fn();
      }),
      settleTaskAgentInstance,
    };
    const coordinator = new TaskDelegationSettlementCoordinator(
      teamRun as any,
      { hasOpenWorkBlockingTaskAgentSettlement: vi.fn(() => false) } as any,
      { markSettledByTaskAgentRunId: vi.fn() } as any,
    );
    const taskAgentInstance = {
      taskAgentInstanceId: "task-agent-1",
      taskAgentRunId: "task-run-1",
      teamRunId: "team-run-1",
      taskId: "task-1",
      logicalMember: {
        memberName: "Worker",
        memberPath: ["worker"],
        memberRouteKey: "worker",
        templateMemberRunId: "worker-template",
      },
      createdAt: new Date().toISOString(),
    };
    coordinator.attach();
    expect(coordinator.requestSettlement(taskAgentInstance)).toBe(true);

    const buildEvent = (eventType: AgentRunEventType, payload: Record<string, unknown>, statusHint: "IDLE" | null): TeamRunEvent => ({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-run-1",
      sourcePath: ["worker"],
      data: {
        runtimeKind: "AUTOBYTEUS" as any,
        memberName: "Worker",
        memberRunId: "task-run-1",
        memberPath: ["worker"],
        memberRouteKey: "worker",
        taskAgentInstance,
        agentEvent: {
          runId: "task-run-1",
          eventType,
          payload,
          statusHint,
        },
      },
    });

    listener!(buildEvent(AgentRunEventType.TURN_COMPLETED, { turn_id: "old-turn" }, "IDLE"));
    await Promise.resolve();
    expect(settleTaskAgentInstance).not.toHaveBeenCalled();

    listener!(buildEvent(AgentRunEventType.AGENT_STATUS, { status: "idle" }, "IDLE"));
    await vi.waitFor(() => expect(settleTaskAgentInstance).toHaveBeenCalledTimes(1));
    coordinator.detach();
  });
});
