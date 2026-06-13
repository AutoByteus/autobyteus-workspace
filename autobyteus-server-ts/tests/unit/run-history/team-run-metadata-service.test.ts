import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";
import {
  TeamRunMetadataService,
  getTeamRunMetadataService,
} from "../../../src/run-history/services/team-run-metadata-service.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

const buildMetadata = (
  overrides: Partial<TeamRunMetadata> = {},
): TeamRunMetadata => ({
  teamRunId: "team-1",
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Team One",
  coordinatorMemberRouteKey: "planner",
  createdAt: "2026-03-26T10:00:00.000Z",
  updatedAt: "2026-03-26T10:00:00.000Z",
  memberTree: [
    {
      memberKind: "agent",
      memberRouteKey: "planner",
      memberPath: ["Planner"],
      memberName: "Planner",
      memberRunId: "planner-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "thread-1",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "model-1",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      llmConfig: null,
      workspaceRootPath: "/tmp/workspace",
    },
  ],
  ...overrides,
});

describe("TeamRunMetadataService", () => {
  const originalMemoryEnv = process.env.AUTOBYTEUS_MEMORY_DIR;
  const tempDirs = new Set<string>();

  beforeEach(() => {
    appConfigProvider.resetForTests();
  });

  afterEach(async () => {
    appConfigProvider.resetForTests();
    if (originalMemoryEnv === undefined) {
      delete process.env.AUTOBYTEUS_MEMORY_DIR;
    } else {
      process.env.AUTOBYTEUS_MEMORY_DIR = originalMemoryEnv;
    }
    await Promise.all(
      Array.from(tempDirs).map((dir) =>
        fs.rm(dir, { recursive: true, force: true }),
      ),
    );
    tempDirs.clear();
  });

  it("delegates metadata reads to the metadata store", async () => {
    const readMetadata = vi.fn().mockResolvedValue(buildMetadata());
    const service = new TeamRunMetadataService("/tmp/memory", {
      metadataStore: {
        readMetadata,
        writeMetadata: vi.fn(),
      },
    });

    const result = await service.readMetadata("team-1");

    expect(readMetadata).toHaveBeenCalledWith("team-1");
    expect(result?.teamRunId).toBe("team-1");
  });

  it("delegates metadata writes to the metadata store", async () => {
    const writeMetadata = vi.fn().mockResolvedValue(undefined);
    const metadata = buildMetadata();
    const service = new TeamRunMetadataService("/tmp/memory", {
      metadataStore: {
        readMetadata: vi.fn(),
        writeMetadata,
      },
    });

    await service.writeMetadata("team-1", metadata);

    expect(writeMetadata).toHaveBeenCalledWith("team-1", metadata);
  });

  it("rebinds the shared service when the app memory root changes", async () => {
    const firstService = getTeamRunMetadataService();
    const customAppDataDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "team-run-metadata-root-"),
    );
    tempDirs.add(customAppDataDir);
    appConfigProvider.config.setCustomAppDataDir(customAppDataDir);

    const secondService = getTeamRunMetadataService();
    const teamRunId = `team-custom-${Date.now()}`;
    await secondService.writeMetadata(teamRunId, buildMetadata({ teamRunId }));

    await expect(firstService.readMetadata(teamRunId)).resolves.toBeNull();
    await expect(
      fs.access(
        path.join(
          customAppDataDir,
          "memory",
          "agent_teams",
          teamRunId,
          "team_run_metadata.json",
        ),
      ),
    ).resolves.toBeUndefined();
  });
});
