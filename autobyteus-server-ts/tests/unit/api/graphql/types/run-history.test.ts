import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAgentRunResumeConfig: vi.fn(),
}));

vi.mock(
  "../../../../../src/api/graphql/studio-application-api-services.js",
  () => ({ getStudioRunModelConfigService: () => ({
    getAgentRunResumeConfig: mocks.getAgentRunResumeConfig,
  }) }),
);
vi.mock(
  "../../../../../src/run-history/services/agent-run-history-service.js",
  () => ({ getAgentRunHistoryService: () => ({}) }),
);
vi.mock(
  "../../../../../src/run-history/services/agent-run-view-projection-service.js",
  () => ({ getAgentRunViewProjectionService: () => ({}) }),
);
vi.mock(
  "../../../../../src/run-history/services/workspace-run-history-service.js",
  () => ({ getWorkspaceRunHistoryService: () => ({}) }),
);
vi.mock(
  "../../../../../src/workspaces/workspace-manager.js",
  () => ({ getWorkspaceManager: () => ({}) }),
);

import { RunHistoryResolver } from "../../../../../src/api/graphql/types/run-history.js";

describe("RunHistoryResolver model-config ownership routing", () => {
  beforeEach(() => mocks.getAgentRunResumeConfig.mockReset());

  it("routes the Agent resume-config query through the owner-aware Studio service", async () => {
    const canonical = {
      runId: "agent-run-1",
      isActive: true,
      metadataConfig: { runId: "agent-run-1" },
      modelConfigEditability: { editable: false, reason: "RUN_ACTIVE" },
    };
    mocks.getAgentRunResumeConfig.mockResolvedValue(canonical);

    await expect(new RunHistoryResolver().getAgentRunResumeConfig("agent-run-1"))
      .resolves.toBe(canonical);
    expect(mocks.getAgentRunResumeConfig).toHaveBeenCalledWith("agent-run-1");
  });
});
