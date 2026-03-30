import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";
import { TeamRunMetadataService } from "../../../src/run-history/services/team-run-metadata-service.js";

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
      memberRouteKey: "planner",
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
});
