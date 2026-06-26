import { describe, expect, it } from "vitest";
import type { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import type { TaskTeamInstanceIdentity } from "../../../src/agent-team-execution/domain/task-team-instance.js";
import { TaskTeamActiveRunDirectory } from "../../../src/agent-team-execution/task-delegation/task-team-active-run-directory.js";

const buildIdentity = (overrides: Partial<TaskTeamInstanceIdentity> = {}): TaskTeamInstanceIdentity => ({
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
    memberPath: ["engineering", "lead"],
    memberRouteKey: "engineering/lead",
    templateMemberRunId: "lead-template-run",
    runtimeKind: "codex_app_server" as never,
  },
  createdAt: "2026-06-26T00:00:00.000Z",
  ...overrides,
});

const buildRun = (runId: string, active = true): TeamRun => ({
  runId,
  isActive: () => active,
} as never);

describe("TaskTeamActiveRunDirectory", () => {
  it("resolves active child runs by task-team run id and child team run id", () => {
    const directory = new TaskTeamActiveRunDirectory();
    const run = buildRun("child-team-run-1");

    const entry = directory.bindActiveRun(buildIdentity(), run);

    expect(entry).toMatchObject({
      parentTeamRunId: "parent-team-run-1",
      taskId: "task_0001",
      logicalTeamRouteKey: "engineering",
      taskTeamRunId: "task-team-run-1",
      childTeamRunId: "child-team-run-1",
    });
    expect(directory.resolveActiveRun("task-team-run-1")).toBe(run);
    expect(directory.resolveActiveRun("child-team-run-1")).toBe(run);
  });

  it("unbinds without retaining tombstones so the same task-team run id can be rebound", () => {
    const directory = new TaskTeamActiveRunDirectory();
    const identity = buildIdentity();
    const firstRun = buildRun("child-team-run-1");
    const secondRun = buildRun("child-team-run-2");

    directory.bindActiveRun(identity, firstRun);
    directory.unbind(identity.taskTeamRunId);

    expect(directory.resolveActiveRun(identity.taskTeamRunId)).toBeNull();
    directory.bindActiveRun(identity, secondRun);
    expect(directory.resolveActiveRun(identity.taskTeamRunId)).toBe(secondRun);
    expect(directory.resolveActiveRun(firstRun.runId)).toBeNull();
  });

  it("cleans all active entries for a parent team run", () => {
    const directory = new TaskTeamActiveRunDirectory();
    directory.bindActiveRun(buildIdentity(), buildRun("child-team-run-1"));
    directory.bindActiveRun(
      buildIdentity({
        taskTeamInstanceId: "task-team-instance-2",
        taskTeamRunId: "task-team-run-2",
        taskId: "task_0002",
      }),
      buildRun("child-team-run-2"),
    );
    directory.bindActiveRun(
      buildIdentity({
        taskTeamInstanceId: "task-team-instance-3",
        taskTeamRunId: "task-team-run-3",
        parentTeamRunId: "other-parent-run",
        taskId: "task_0003",
      }),
      buildRun("child-team-run-3"),
    );

    directory.unbindForParentTeamRun("parent-team-run-1");

    expect(directory.resolveActiveRun("task-team-run-1")).toBeNull();
    expect(directory.resolveActiveRun("task-team-run-2")).toBeNull();
    expect(directory.resolveActiveRun("task-team-run-3")?.runId).toBe("child-team-run-3");
  });
});
