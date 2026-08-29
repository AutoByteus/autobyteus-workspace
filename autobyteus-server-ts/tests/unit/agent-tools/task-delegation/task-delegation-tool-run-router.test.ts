import { describe, expect, it, vi } from "vitest";
import type { RootTeamRun } from "../../../../src/agent-team-execution/domain/root-team-run.js";
import type { TaskDelegationToolContext } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { TaskDelegationToolRunRouter } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-run-router.js";

const buildContext = (
  resolveActiveRoot: () => Promise<RootTeamRun>,
  rootTeamRunId = "root-team-run",
): TaskDelegationToolContext => ({
  identity: {
    rootTeamRunId,
    memberAddress: "/coordinator",
    agentRunId: "coordinator-run",
  },
  rootResolver: Object.freeze({ resolveActiveRoot }),
});

describe("TaskDelegationToolRunRouter", () => {
  it("resolves the one exact active RootTeamRun from the bound capability", async () => {
    const root = { teamRunId: "root-team-run" } as RootTeamRun;
    const resolveActiveRoot = vi.fn(async () => root);
    const router = new TaskDelegationToolRunRouter();

    await expect(router.resolveRoot(buildContext(resolveActiveRoot))).resolves.toBe(root);
    expect(resolveActiveRoot).toHaveBeenCalledWith();
  });

  it("propagates the bound resolver failure without lookup or restoration", async () => {
    const router = new TaskDelegationToolRunRouter();
    const failure = Object.assign(new Error("inactive"), { code: "TEAM_RUN_NOT_ACTIVE" });

    await expect(router.resolveRoot(buildContext(async () => { throw failure; }))).rejects.toMatchObject({
      code: "TEAM_RUN_NOT_ACTIVE",
    });
  });
});
