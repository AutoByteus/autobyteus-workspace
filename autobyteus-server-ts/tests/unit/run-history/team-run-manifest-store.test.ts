import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamRunManifestStore } from "../../../src/run-history/store/team-run-manifest-store.js";

const createTempMemoryDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-run-manifest-"));

describe("TeamRunManifestStore", () => {
  let memoryDir: string;
  let store: TeamRunManifestStore;

  beforeEach(async () => {
    memoryDir = await createTempMemoryDir();
    store = new TeamRunManifestStore(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("writes and reads normalized team manifest", async () => {
    await store.writeManifest("  team-1  ", {
      teamRunId: "ignored",
      teamDefinitionId: "  team-def-1 ",
      teamDefinitionName: "  Classroom Team ",
      coordinatorMemberRouteKey: " /coordinator// ",
      runVersion: 2,
      createdAt: "2026-02-15T00:00:00.000Z",
      updatedAt: "2026-02-15T00:01:00.000Z",
      memberBindings: [
        {
          memberRouteKey: " coordinator\\\\researcher ",
          memberName: " Researcher ",
          memberAgentId: " member-1 ",
          agentDefinitionId: " agent-def-r ",
          llmModelIdentifier: " model-r ",
          autoExecuteTools: true,
          llmConfig: { temperature: 0.4 },
          workspaceRootPath: "/tmp/workspace////",
          hostNodeId: " node-a ",
        },
      ],
    });

    const manifest = await store.readManifest("team-1");
    expect(manifest).toEqual({
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamDefinitionName: "Classroom Team",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 2,
      createdAt: "2026-02-15T00:00:00.000Z",
      updatedAt: "2026-02-15T00:01:00.000Z",
      memberBindings: [
        {
          memberRouteKey: "coordinator/researcher",
          memberName: "Researcher",
          memberAgentId: "member-1",
          agentDefinitionId: "agent-def-r",
          llmModelIdentifier: "model-r",
          autoExecuteTools: true,
          llmConfig: { temperature: 0.4 },
          workspaceRootPath: path.resolve("/tmp/workspace"),
          hostNodeId: "node-a",
        },
      ],
    });
  });

  it("returns null for malformed manifest", async () => {
    const manifestPath = store.getManifestPath("team-bad");
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(
      manifestPath,
      JSON.stringify({
        teamRunId: "team-bad",
        memberBindings: "invalid",
      }),
      "utf-8",
    );

    const manifest = await store.readManifest("team-bad");
    expect(manifest).toBeNull();
  });

  it("lists team ids from team manifest directories", async () => {
    await store.writeManifest("team-a", {
      teamRunId: "team-a",
      teamDefinitionId: "d1",
      teamDefinitionName: "Team A",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: "2026-02-15T00:00:00.000Z",
      updatedAt: "2026-02-15T00:00:00.000Z",
      memberBindings: [],
    });
    await store.writeManifest("team-b", {
      teamRunId: "team-b",
      teamDefinitionId: "d2",
      teamDefinitionName: "Team B",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: "2026-02-15T00:00:00.000Z",
      updatedAt: "2026-02-15T00:00:00.000Z",
      memberBindings: [],
    });

    const teamIds = await store.listTeamIds();
    expect(teamIds).toEqual(["team-a", "team-b"]);
  });

  it("keeps manifest store boundary to manifest-only I/O", async () => {
    await store.writeManifest("team-layout", {
      teamRunId: "team-layout",
      teamDefinitionId: "d1",
      teamDefinitionName: "Team Layout",
      coordinatorMemberRouteKey: "leader",
      runVersion: 1,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
      memberBindings: [
        {
          memberRouteKey: "leader",
          memberName: "Leader",
          memberAgentId: "member_layout_leader",
          agentDefinitionId: "agent-def-leader",
          llmModelIdentifier: "model-leader",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: null,
          hostNodeId: null,
        },
      ],
    });

    const teamDir = store.getTeamDirPath("team-layout");
    const teamEntries = await fs.readdir(teamDir);
    expect(teamEntries).toEqual(["team_run_manifest.json"]);
  });
});
