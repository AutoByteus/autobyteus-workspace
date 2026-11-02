import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import "reflect-metadata";
import { buildSchema, Query, Resolver } from "type-graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTeamRunService = vi.hoisted(() => ({
  restoreTeamRun: vi.fn(),
  createTeamRun: vi.fn(),
  terminateTeamRun: vi.fn(),
}));
const mockRunModelConfigService = vi.hoisted(() => ({
  updateStoppedTeamRunSelections: vi.fn(),
}));

vi.mock(
  "../../../../../src/api/graphql/studio-application-api-services.js",
  () => ({
    getStudioTeamRunService: () => mockTeamRunService,
    getStudioRunModelConfigService: () => mockRunModelConfigService,
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
    mockRunModelConfigService.updateStoppedTeamRunSelections.mockReset();
  });

  it("routes only stopped model-config updates through the owner-aware Studio service", async () => {
    mockRunModelConfigService.updateStoppedTeamRunSelections.mockResolvedValue({
      success: false,
      outcome: "RUN_ACTIVE",
      message: "locked",
      isActive: true,
      editability: { editable: false, reason: "RUN_ACTIVE" },
      canonical: null,
      fieldErrors: [],
    });
    const resolver = new AgentTeamRunResolver();
    const input = {
      teamRunId: "team-run-1",
      selectionPatches: [{ scopeKind: "CONFIGURED_TEAM" as const, scopeAddress: "/", runtimeKind: RuntimeKind.AUTOBYTEUS, llmConfig: null }],
    };

    await expect(resolver.updateStoppedTeamRunSelections(input))
      .resolves.toMatchObject({ outcome: "RUN_ACTIVE", canonicalExecutionTree: null });
    expect(mockRunModelConfigService.updateStoppedTeamRunSelections).toHaveBeenCalledWith(input);
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
