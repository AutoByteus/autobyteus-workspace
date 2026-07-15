import { describe, expect, it } from "vitest";
import { WorkspaceRemovalGuard } from "../../../src/workspaces/workspace-removal-guard.js";
import { buildFilesystemWorkspaceId } from "../../../src/workspaces/workspace-registry-store.js";

const workspaceRootPath = "/tmp/autobyteus-workspace-removal-guard";
const workspaceId = buildFilesystemWorkspaceId(workspaceRootPath);

describe("WorkspaceRemovalGuard", () => {
  it("blocks standalone agent runs by canonical active workspace root", async () => {
    const guard = new WorkspaceRemovalGuard(
      {
        listActiveRuns: () => ["run-1"],
        getActiveRun: () => ({ config: { workspaceId: "legacy-active-workspace-id" } }) as any,
      },
      {
        listActiveRuns: () => [],
        getActiveRun: () => null,
      },
      (activeWorkspaceId) =>
        activeWorkspaceId === "legacy-active-workspace-id"
          ? `${workspaceRootPath}/.`
          : null,
    );

    const result = await guard.checkWorkspaceCanBeRemoved({
      workspaceId,
      workspaceRootPath,
    });

    expect(result.blocked).toBe(true);
    expect(result.blockers).toEqual([{ kind: "agent_run", runId: "run-1" }]);
  });

  it("blocks nested team members by canonical workspace root", async () => {
    const guard = new WorkspaceRemovalGuard(
      {
        listActiveRuns: () => [],
        getActiveRun: () => null,
      },
      {
        listActiveRuns: () => ["team-1"],
        getActiveRun: () => ({
          config: {
            memberTree: [
              {
                memberKind: "agent_team",
                memberConfigs: [
                  {
                    memberKind: "agent",
                    workspaceRootPath: `${workspaceRootPath}/.`,
                  },
                ],
              },
            ],
          },
        }) as any,
      },
    );

    const result = await guard.checkWorkspaceCanBeRemoved({
      workspaceId,
      workspaceRootPath,
    });

    expect(result.blocked).toBe(true);
    expect(result.blockers).toEqual([{ kind: "team_run", runId: "team-1" }]);
  });

  it("allows removal when active runs use other workspaces", async () => {
    const guard = new WorkspaceRemovalGuard(
      {
        listActiveRuns: () => ["run-1"],
        getActiveRun: () => ({ config: { workspaceId: buildFilesystemWorkspaceId("/tmp/other") } }) as any,
      },
      {
        listActiveRuns: () => ["team-1"],
        getActiveRun: () => ({
          config: {
            memberTree: [
              {
                memberKind: "agent",
                workspaceRootPath: "/tmp/other",
              },
            ],
          },
        }) as any,
      },
    );

    const result = await guard.checkWorkspaceCanBeRemoved({
      workspaceId,
      workspaceRootPath,
    });

    expect(result).toEqual({
      blocked: false,
      message: null,
      blockers: [],
    });
  });
});
