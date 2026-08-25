import "reflect-metadata";
import { buildSchema, Query, Resolver } from "type-graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTeamRunService = vi.hoisted(() => ({
  restoreTeamRun: vi.fn(),
  createTeamRun: vi.fn(),
  terminateTeamRun: vi.fn(),
}));

vi.mock(
  "../../../../../src/api/graphql/studio-application-api-services.js",
  () => ({
    getStudioTeamRunService: () => mockTeamRunService,
  }),
);

import { AgentTeamRunResolver } from "../../../../../src/api/graphql/types/agent-team-run.js";

@Resolver()
class TestQueryResolver {
  @Query(() => Boolean)
  testQuery(): boolean { return true; }
}

describe("AgentTeamRunResolver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockTeamRunService.restoreTeamRun.mockReset();
    mockTeamRunService.createTeamRun.mockReset();
    mockTeamRunService.terminateTeamRun.mockReset();
  });

  it("routes restore through TeamRunService", async () => {
    mockTeamRunService.restoreTeamRun.mockResolvedValue({
      teamRunId: "team-run-1",
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

  it("requires runtimeKind on every full-hierarchy Team and Agent input", async () => {
    const schema = await buildSchema({
      resolvers: [AgentTeamRunResolver, TestQueryResolver],
      validate: false,
    });

    for (const inputTypeName of ["TeamScopeLaunchConfigInput", "TeamMemberConfigInput"]) {
      const inputType = schema.getType(inputTypeName);
      expect(inputType && "getFields" in inputType
        ? inputType.getFields().runtimeKind?.type.toString()
        : null).toBe("String!");
    }
  });
});
