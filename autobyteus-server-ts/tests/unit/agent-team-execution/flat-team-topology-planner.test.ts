import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { FlatTeamTopologyPlanner } from "../../../src/agent-team-execution/services/flat-team-topology-planner.js";

const definition = (overrides: Record<string, unknown> = {}) => ({
  id: "root-team",
  name: "Root Team",
  description: "",
  instructions: "",
  coordinatorMemberName: "Lead",
  nodes: [
    { memberName: "Lead", refScope: "shared", ref: "agent-lead" },
    { memberName: "Reviewer", refScope: "shared", ref: "agent-reviewer" },
  ],
  handoffs: [{ from: "/Lead", to: "/Reviewer", rules: ["When review should begin."] }],
  ...overrides,
});

const buildPlanner = (value: unknown = definition()) => {
  const teamAllocator = { allocateForTeamDefinitionName: vi.fn((name: string) => `team-${name.replaceAll(" ", "-").toLowerCase()}`) };
  const agentAllocator = { allocateForAgentDefinition: vi.fn(async (id: string) => `run-${id}`) };
  const planner = new FlatTeamTopologyPlanner(
    { getDefinitionById: vi.fn(async () => value) } as never,
    teamAllocator,
    agentAllocator,
  );
  return { planner, teamAllocator, agentAllocator };
};

const launch = {
  llmModelIdentifier: "gpt-test",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  workspaceRootPath: "/tmp/workspace",
  llmConfig: null,
};
const rootConfig = (overrides: Record<string, unknown> = {}) => ({ teamAddress: "/", ...launch, ...overrides });
const memberConfig = (memberAddress: string, overrides: Record<string, unknown> = {}) => ({ memberAddress, ...launch, ...overrides });

describe("FlatTeamTopologyPlanner", () => {
  it("allocates exactly one Agent-only Team and preserves authored handoff/rule order", async () => {
    const plan = await buildPlanner().planner.buildPlan({
      teamDefinitionId: "root-team",
      teamConfigs: [rootConfig()],
      memberConfigs: [memberConfig("/Lead"), memberConfig("/Reviewer")],
    });

    expect(plan).toMatchObject({ teamDefinitionName: "Root Team", hasSubTeams: false });
    expect(plan.config.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(plan.config.rootTeam).toMatchObject({
      kind: "agent_team",
      address: "/",
      teamRunId: "team-root-team",
      coordinatorAddress: "/Lead",
      children: [
        { kind: "agent", address: "/Lead", agentDefinitionId: "agent-lead", agentRunId: "run-agent-lead" },
        { kind: "agent", address: "/Reviewer", agentDefinitionId: "agent-reviewer", agentRunId: "run-agent-reviewer" },
      ],
    });
    expect(plan.agentLaunchSettings.map((item) => item.memberAddress)).toEqual(["/Lead", "/Reviewer"]);
    expect(plan.config.handoffs).toEqual([
      { from: "/Lead", to: "/Reviewer", rules: ["When review should begin."] },
    ]);
  });

  it("rejects configured Team members before allocating execution identities", async () => {
    const { planner, teamAllocator, agentAllocator } = buildPlanner(definition({
      nodes: [
        { memberName: "Lead", refScope: "shared", ref: "agent-lead" },
        { memberName: "Nested", refScope: "shared", ref: "nested-team", refType: "agent_team" },
      ],
    }));

    await expect(planner.buildPlan({
      teamDefinitionId: "root-team",
      teamConfigs: [rootConfig()],
      memberConfigs: [memberConfig("/Lead")],
    })).rejects.toThrow();
    expect(teamAllocator.allocateForTeamDefinitionName).not.toHaveBeenCalled();
    expect(agentAllocator.allocateForAgentDefinition).not.toHaveBeenCalled();
  });

  it.each([
    { name: "missing root", teamConfigs: [], members: [memberConfig("/Lead"), memberConfig("/Reviewer")] },
    { name: "extra Team scope", teamConfigs: [rootConfig(), { ...rootConfig(), teamAddress: "/Nested" }], members: [memberConfig("/Lead"), memberConfig("/Reviewer")] },
    { name: "missing Agent", teamConfigs: [rootConfig()], members: [memberConfig("/Lead")] },
    { name: "unknown Agent", teamConfigs: [rootConfig()], members: [memberConfig("/Lead"), memberConfig("/Reviewer"), memberConfig("/Unknown")] },
    { name: "wrong definition", teamConfigs: [rootConfig()], members: [memberConfig("/Lead", { agentDefinitionId: "wrong" }), memberConfig("/Reviewer")] },
    { name: "divergent skill policy", teamConfigs: [rootConfig()], members: [memberConfig("/Lead"), memberConfig("/Reviewer", { skillAccessMode: SkillAccessMode.NONE })] },
  ])("rejects $name before allocation", async ({ teamConfigs, members }) => {
    const { planner, teamAllocator, agentAllocator } = buildPlanner();
    await expect(planner.buildPlan({ teamDefinitionId: "root-team", teamConfigs, memberConfigs: members })).rejects.toThrow();
    expect(teamAllocator.allocateForTeamDefinitionName).not.toHaveBeenCalled();
    expect(agentAllocator.allocateForAgentDefinition).not.toHaveBeenCalled();
  });

  it("rejects an admitted definition identity mismatch", async () => {
    await expect(buildPlanner(definition({ id: "other-team" })).planner.buildPlan({
      teamDefinitionId: "root-team",
      teamConfigs: [rootConfig()],
      memberConfigs: [memberConfig("/Lead"), memberConfig("/Reviewer")],
    })).rejects.toThrow("Admitted Team definition identity does not match 'root-team'");
  });

  it("builds configuration-first launch inputs for every direct Agent", async () => {
    const result = await buildPlanner().planner.buildRootLaunchInputs({
      teamDefinitionId: "root-team",
      rootConfig: launch,
    });
    expect(result.teamConfigs.map((item) => item.teamAddress)).toEqual(["/"]);
    expect(result.memberConfigs.map((item) => [item.memberAddress, item.agentDefinitionId])).toEqual([
      ["/Lead", "agent-lead"],
      ["/Reviewer", "agent-reviewer"],
    ]);
  });
});
