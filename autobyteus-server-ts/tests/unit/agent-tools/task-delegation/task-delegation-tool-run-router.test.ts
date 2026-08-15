import { describe, expect, it, vi } from "vitest";
import type { RootTeamRun } from "../../../../src/agent-team-execution/domain/root-team-run.js";
import type { TaskDelegationToolContext } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { TaskDelegationToolRunRouter } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-run-router.js";

const buildContext = (rootTeamRunId = "root-team-run"): TaskDelegationToolContext => ({
  identity: {
    rootTeamRunId,
    memberAddress: "/coordinator",
    agentRunId: "coordinator-run",
  },
});

describe("TaskDelegationToolRunRouter", () => {
  it("resolves the one exact active/restorable RootTeamRun", async () => {
    const root = { teamRunId: "root-team-run" } as RootTeamRun;
    const resolveTeamRun = vi.fn(async () => root);
    const router = new TaskDelegationToolRunRouter({ resolveTeamRun } as never);

    await expect(router.resolveRoot(buildContext())).resolves.toBe(root);
    expect(resolveTeamRun).toHaveBeenCalledWith("root-team-run");
  });

  it("rejects a missing root without a child-directory or per-Team fallback", async () => {
    const router = new TaskDelegationToolRunRouter({
      resolveTeamRun: vi.fn(async () => null),
    } as never);

    await expect(router.resolveRoot(buildContext())).rejects.toMatchObject({
      code: "TEAM_RUN_NOT_FOUND",
    });
  });

  it("rejects a contradictory resolved root identity", async () => {
    const router = new TaskDelegationToolRunRouter({
      resolveTeamRun: vi.fn(async () => ({ teamRunId: "other-root" })),
    } as never);

    await expect(router.resolveRoot(buildContext())).rejects.toMatchObject({
      code: "TEAM_RUN_NOT_FOUND",
    });
  });
});
