import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTeamRunService = vi.hoisted(() => ({
  restoreTeamRun: vi.fn(),
  createTeamRun: vi.fn(),
  terminateTeamRun: vi.fn(),
}));

vi.mock(
  "../../../../../src/agent-team-execution/services/team-run-service.js",
  () => ({
    getTeamRunService: () => mockTeamRunService,
  }),
);

import { AgentTeamRunResolver } from "../../../../../src/api/graphql/types/agent-team-run.js";

describe("AgentTeamRunResolver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockTeamRunService.restoreTeamRun.mockReset();
    mockTeamRunService.createTeamRun.mockReset();
    mockTeamRunService.terminateTeamRun.mockReset();
  });

  it("routes restore through TeamRunService", async () => {
    mockTeamRunService.restoreTeamRun.mockResolvedValue({
      runId: "team-run-1",
    });
    const resolver = new AgentTeamRunResolver();

    const result = await resolver.restoreAgentTeamRun("team-run-1");

    expect(result).toEqual({
      success: true,
      message: "Agent team run restored successfully.",
      teamRunId: "team-run-1",
    });
    expect(mockTeamRunService.restoreTeamRun).toHaveBeenCalledWith("team-run-1");
  });
});
