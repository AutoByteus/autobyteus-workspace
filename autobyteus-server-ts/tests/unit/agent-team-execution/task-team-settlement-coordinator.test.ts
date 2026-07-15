import { afterEach, describe, expect, it, vi } from "vitest";
import type { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import type { TaskTeamInstanceIdentity } from "../../../src/agent-team-execution/domain/task-team-instance.js";
import type { TeamRunEventListener } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { TaskTeamActiveRunDirectory } from "../../../src/agent-team-execution/task-delegation/task-team-active-run-directory.js";
import { TaskTeamSettlementCoordinator } from "../../../src/agent-team-execution/task-delegation/task-team-settlement-coordinator.js";
import { disposeTaskAgentDirectory } from "../../../src/agent-team-execution/task-delegation/task-agent-directory.js";

const buildIdentity = (): TaskTeamInstanceIdentity => ({
  taskTeamInstanceId: "task-team-instance-1",
  taskTeamRunId: "task-team-run-1",
  parentTeamRunId: "parent-team-run-1",
  taskId: "task_0001",
  logicalTeam: {
    memberName: "engineering",
    memberPath: ["engineering"],
    memberRouteKey: "engineering",
    templateMemberRunId: "engineering-template-run",
    teamDefinitionId: "engineering-team",
    coordinatorMemberRouteKey: "lead",
  },
  ingress: {
    memberName: "lead",
    memberPath: ["lead"],
    memberRouteKey: "lead",
    memberRunId: "lead-template-run",
  },
  createdAt: "2026-07-04T00:00:00.000Z",
});

const nextTick = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

afterEach(() => {
  disposeTaskAgentDirectory("child-team-run-1");
});

describe("TaskTeamSettlementCoordinator", () => {
  it("settles known inactive task-team bindings and removes cleanup directories", async () => {
    const identity = buildIdentity();
    const directory = new TaskTeamActiveRunDirectory();
    const childListeners = new Set<TeamRunEventListener>();
    const childRun = {
      runId: "child-team-run-1",
      isActive: () => false,
      getStatusSnapshot: () => ({ status: "offline" }),
      subscribeToEvents: vi.fn((listener: TeamRunEventListener) => {
        childListeners.add(listener);
        return () => childListeners.delete(listener);
      }),
    } as unknown as TeamRun;
    directory.bindActiveRun(identity, childRun);
    const parentTeamRun = {
      settleTaskTeamInstance: vi.fn(async () => ({ accepted: true })),
    } as unknown as TeamRun;
    const runRegistry = {
      getExisting: vi.fn(() => null),
      detach: vi.fn(),
    };
    const coordinator = new TaskTeamSettlementCoordinator({
      parentTeamRun,
      taskTeamDirectory: directory,
      runRegistry: runRegistry as never,
    });

    expect(coordinator.requestSettlement(identity)).toBe(true);
    await nextTick();

    expect(parentTeamRun.settleTaskTeamInstance).toHaveBeenCalledTimes(1);
    expect(parentTeamRun.settleTaskTeamInstance).toHaveBeenCalledWith(
      "engineering",
      "task-team-run-1",
      expect.stringMatching(/^task_team_delegation_safe_after_/),
    );
    expect(runRegistry.detach).toHaveBeenCalledWith("child-team-run-1");
    expect(directory.resolveKnownEntryByTaskTeamRunId(identity.taskTeamRunId)).toBeNull();
    expect(childRun.subscribeToEvents).toHaveBeenCalledTimes(1);
  });

  it("treats duplicate child wakeups as signals for one settling lifecycle", async () => {
    const identity = buildIdentity();
    const directory = new TaskTeamActiveRunDirectory();
    const childListeners = new Set<TeamRunEventListener>();
    const childRun = {
      runId: "child-team-run-1",
      isActive: () => true,
      getStatusSnapshot: () => ({ status: "idle" }),
      subscribeToEvents: vi.fn((listener: TeamRunEventListener) => {
        childListeners.add(listener);
        return () => childListeners.delete(listener);
      }),
    } as unknown as TeamRun;
    directory.bindActiveRun(identity, childRun);
    let resolveSettle: ((value: { accepted: true }) => void) | null = null;
    const parentTeamRun = {
      settleTaskTeamInstance: vi.fn(() => new Promise<{ accepted: true }>((resolve) => {
        resolveSettle = resolve;
      })),
    } as unknown as TeamRun;
    const coordinator = new TaskTeamSettlementCoordinator({
      parentTeamRun,
      taskTeamDirectory: directory,
      runRegistry: {
        getExisting: vi.fn(() => null),
        detach: vi.fn(),
      } as never,
    });

    coordinator.requestSettlement(identity);
    await nextTick();
    for (const listener of childListeners) listener({} as never);
    for (const listener of childListeners) listener({} as never);
    await nextTick();

    expect(parentTeamRun.settleTaskTeamInstance).toHaveBeenCalledTimes(1);
    resolveSettle?.({ accepted: true });
    await nextTick();
    expect(directory.resolveKnownEntryByTaskTeamRunId(identity.taskTeamRunId)).toBeNull();
  });
});
