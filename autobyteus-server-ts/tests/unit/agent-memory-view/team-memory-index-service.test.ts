import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TeamRunManifestStore } from "../../../src/run-history/store/team-run-manifest-store.js";
import { TeamMemoryIndexService } from "../../../src/agent-memory-view/services/team-memory-index-service.js";

const touch = (filePath: string, mtime: number) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "{}", "utf-8");
  fs.utimesSync(filePath, mtime, mtime);
};

describe("TeamMemoryIndexService", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("lists team snapshots with member memory flags", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "team-memory-index-"));

    const manifestStore = new TeamRunManifestStore(tempDir);
    await manifestStore.writeManifest("team-1", {
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamDefinitionName: "Alpha Team",
      workspaceRootPath: null,
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: "2026-03-07T00:00:00Z",
      updatedAt: "2026-03-07T00:00:00Z",
      memberBindings: [
        {
          memberRouteKey: "coordinator",
          memberName: "Coordinator",
          memberRunId: "member-1",
          runtimeKind: "autobyteus",
          runtimeReference: null,
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "model-a",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: null,
        },
      ],
    });

    touch(path.join(tempDir, "agent_teams", "team-1", "member-1", "raw_traces.jsonl"), 2000);

    const service = new TeamMemoryIndexService(tempDir);
    const page = await service.listTeamSnapshots();

    expect(page.entries).toHaveLength(1);
    expect(page.entries[0]?.teamRunId).toBe("team-1");
    expect(page.entries[0]?.members).toHaveLength(1);
    expect(page.entries[0]?.members[0]?.memberRunId).toBe("member-1");
    expect(page.entries[0]?.members[0]?.hasRawTraces).toBe(true);
  });

  it("filters by search and paginates team results", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "team-memory-index-"));
    const manifestStore = new TeamRunManifestStore(tempDir);

    await manifestStore.writeManifest("team-a", {
      teamRunId: "team-a",
      teamDefinitionId: "team-def-a",
      teamDefinitionName: "Alpha",
      workspaceRootPath: null,
      coordinatorMemberRouteKey: "lead",
      runVersion: 1,
      createdAt: "2026-03-07T00:00:00Z",
      updatedAt: "2026-03-07T00:00:00Z",
      memberBindings: [
        {
          memberRouteKey: "lead",
          memberName: "Lead",
          memberRunId: "a-run",
          runtimeKind: "autobyteus",
          runtimeReference: null,
          agentDefinitionId: "agent-def-a",
          llmModelIdentifier: "model-a",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: null,
        },
      ],
    });

    await manifestStore.writeManifest("team-b", {
      teamRunId: "team-b",
      teamDefinitionId: "team-def-b",
      teamDefinitionName: "Beta",
      workspaceRootPath: null,
      coordinatorMemberRouteKey: "dev",
      runVersion: 1,
      createdAt: "2026-03-07T00:00:00Z",
      updatedAt: "2026-03-07T00:00:00Z",
      memberBindings: [
        {
          memberRouteKey: "dev",
          memberName: "Developer",
          memberRunId: "b-run",
          runtimeKind: "autobyteus",
          runtimeReference: null,
          agentDefinitionId: "agent-def-b",
          llmModelIdentifier: "model-b",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: null,
        },
      ],
    });

    const service = new TeamMemoryIndexService(tempDir);
    const page = await service.listTeamSnapshots("beta", 1, 1);

    expect(page.total).toBe(1);
    expect(page.entries).toHaveLength(1);
    expect(page.entries[0]?.teamRunId).toBe("team-b");
    expect(page.page).toBe(1);
    expect(page.totalPages).toBe(1);
  });
});
