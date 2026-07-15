import { describe, expect, it, vi } from "vitest";
import type { TeamRun } from "../../../../src/agent-team-execution/domain/team-run.js";
import type { TaskDelegationToolContext } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { TaskDelegationToolRunRouter } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-run-router.js";

const buildRun = (runId: string): TeamRun => ({ runId, isActive: () => true } as never);

const buildContext = (overrides: Partial<TaskDelegationToolContext> = {}): TaskDelegationToolContext => ({
  teamRunId: "current-team-run",
  teamDefinitionId: "team-def",
  teamName: "Team",
  coordinatorMemberRouteKey: "coordinator",
  caller: {
    memberKind: "agent",
    memberName: "coordinator",
    memberPath: ["coordinator"],
    memberRouteKey: "coordinator",
    memberRunId: "coordinator-run",
    runtimeKind: "codex_app_server" as never,
    role: null,
    description: null,
    taskTeamInstance: null,
  },
  members: [],
  ...overrides,
});

describe("TaskDelegationToolRunRouter", () => {
  it("resolves delegate/review services from the current top-level team run", async () => {
    const currentRun = buildRun("current-team-run");
    const service = { name: "current-service" };
    const router = new TaskDelegationToolRunRouter({
      teamRunService: { resolveTeamRun: vi.fn(async () => currentRun) } as never,
      runRegistry: { getOrCreate: vi.fn(() => service) } as never,
    });

    await expect(router.resolveServiceForDelegateOrReview(buildContext()))
      .resolves.toBe(service);
  });

  it("falls back to the active task-team directory for task-scoped child team runs", async () => {
    const childRun = buildRun("child-team-run");
    const childService = { name: "child-service" };
    const router = new TaskDelegationToolRunRouter({
      teamRunService: { resolveTeamRun: vi.fn(async () => null) } as never,
      taskTeamActiveRunDirectory: { resolveActiveRun: vi.fn(() => childRun) } as never,
      runRegistry: { getOrCreate: vi.fn(() => childService) } as never,
    });

    await expect(router.resolveServiceForDelegateOrReview(buildContext({ teamRunId: "child-team-run" })))
      .resolves.toBe(childService);
  });

  it("routes task-team ingress submission to the parent task delegation service", async () => {
    const parentRun = buildRun("parent-team-run");
    const parentService = { name: "parent-service" };
    const router = new TaskDelegationToolRunRouter({
      teamRunService: { resolveTeamRun: vi.fn(async (runId: string) => runId === parentRun.runId ? parentRun : null) } as never,
      runRegistry: { getOrCreate: vi.fn(() => parentService) } as never,
    });
    const taskTeamInstance = {
      taskTeamInstanceId: "task-team-instance-1",
      taskTeamRunId: "task-team-run-1",
      parentTeamRunId: "parent-team-run",
      taskId: "task_0001",
      logicalTeam: {} as never,
      ingress: {} as never,
      createdAt: "2026-06-26T00:00:00.000Z",
    };

    const route = await router.resolveServiceForSubmit(buildContext({
      teamRunId: "child-team-run",
      caller: {
        ...buildContext().caller,
        taskTeamInstance,
      },
    }));

    expect(route).toMatchObject({
      kind: "task_team_ingress_parent",
      service: parentService,
      taskTeamInstance,
    });
  });

  it("keeps task-agent submit routing on the current service even when parent task-team metadata is present", async () => {
    const currentRun = buildRun("current-team-run");
    const currentService = { name: "current-service" };
    const router = new TaskDelegationToolRunRouter({
      teamRunService: { resolveTeamRun: vi.fn(async (runId: string) => runId === currentRun.runId ? currentRun : null) } as never,
      runRegistry: { getOrCreate: vi.fn(() => currentService) } as never,
    });

    const route = await router.resolveServiceForSubmit(buildContext({
      caller: {
        ...buildContext().caller,
        taskAgentRunId: "task-agent-run-1",
        taskAgentInstanceId: "task-agent-instance-1",
        taskId: "task_0001",
        logicalMemberRouteKey: "coordinator",
        taskTeamInstance: {
          taskTeamInstanceId: "task-team-instance-1",
          taskTeamRunId: "task-team-run-1",
          parentTeamRunId: "parent-team-run",
          taskId: "task_0002",
          logicalTeam: {} as never,
          ingress: {} as never,
          createdAt: "2026-06-26T00:00:00.000Z",
        },
      },
    }));

    expect(route).toMatchObject({ kind: "current", service: currentService });
  });
});
