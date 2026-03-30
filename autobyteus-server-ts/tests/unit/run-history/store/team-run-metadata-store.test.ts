import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunMetadataStore } from "../../../../src/run-history/store/team-run-metadata-store.js";
import type { TeamRunMetadata } from "../../../../src/run-history/store/team-run-metadata-types.js";

const buildMetadata = (
  overrides: Partial<TeamRunMetadata> = {},
): TeamRunMetadata => ({
  teamRunId: "team-1",
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Team One",
  coordinatorMemberRouteKey: "planner",
  runVersion: 1,
  createdAt: "2026-03-26T10:00:00.000Z",
  updatedAt: "2026-03-26T10:00:00.000Z",
  memberMetadata: [
    {
      memberRouteKey: " planner ",
      memberName: "Planner",
      memberRunId: "planner-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "thread-1",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "model-1",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      llmConfig: null,
      workspaceRootPath: "/tmp/workspace/",
    },
  ],
  ...overrides,
});

describe("TeamRunMetadataStore", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-metadata-store-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("round-trips normalized team metadata", async () => {
    const store = new TeamRunMetadataStore(memoryDir);
    await store.writeMetadata("team-1", buildMetadata());

    const metadata = await store.readMetadata("team-1");

    expect(metadata?.memberMetadata[0]?.memberRouteKey).toBe("planner");
    expect(metadata?.memberMetadata[0]?.workspaceRootPath).toBe("/tmp/workspace");
    expect(metadata?.coordinatorMemberRouteKey).toBe("planner");
  });

  it("lists persisted team run IDs from metadata directories", async () => {
    const store = new TeamRunMetadataStore(memoryDir);
    await store.writeMetadata("team-b", buildMetadata({ teamRunId: "team-b" }));
    await store.writeMetadata("team-a", buildMetadata({ teamRunId: "team-a" }));

    await expect(store.listTeamRunIds()).resolves.toEqual(["team-a", "team-b"]);
  });
});
