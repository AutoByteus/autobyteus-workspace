import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  buildTeamLocalAgentDefinitionId,
  buildTeamLocalTeamDefinitionId,
} from "../../../src/agent-team-definition/utils/team-local-definition-id.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamDefinitionTopologyPlanner } from "../../../src/agent-team-execution/services/team-definition-topology-planner.js";

const buildPlanner = (definitions: Map<string, unknown>): TeamDefinitionTopologyPlanner =>
  new TeamDefinitionTopologyPlanner(
    { getDefinitionById: vi.fn(async (id: string) => definitions.get(id) ?? null) } as never,
    { allocateForAgentDefinition: vi.fn(async (id: string) => `run-${id}`) } as never,
  );

const buildLeafConfig = (memberAddress: string) => ({
  memberAddress,
  llmModelIdentifier: "gpt-test",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  workspaceRootPath: "/tmp/workspace",
  llmConfig: null,
  applicationExecutionContext: null,
});

const buildTeamConfig = (teamAddress: string) => ({
  teamAddress,
  llmModelIdentifier: "gpt-test",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  workspaceRootPath: "/tmp/workspace",
  llmConfig: null,
});

const rootAndReviewDefinitions = () => new Map<string, unknown>([
  ["root-team", {
    name: "Root Team",
    coordinatorMemberName: "Lead",
    nodes: [
      { memberName: "Lead", refType: "agent", refScope: "shared", ref: "agent-lead" },
      { memberName: "ReviewTeam", refType: "agent_team", refScope: "shared", ref: "review-team" },
    ],
    handoffs: [{ from: "/Lead", to: "/ReviewTeam", rules: ["When review should begin."] }],
  }],
  ["review-team", {
    name: "Review Team",
    coordinatorMemberName: "Reviewer",
    nodes: [
      { memberName: "Reviewer", refType: "agent", refScope: "shared", ref: "agent-reviewer" },
      { memberName: "Approver", refType: "agent", refScope: "shared", ref: "agent-approver" },
    ],
    handoffs: [{ from: "/Reviewer", to: "/Approver", rules: ["When a review is ready for approval."] }],
  }],
]);

describe("TeamDefinitionTopologyPlanner", () => {
  it("allocates exact recursive Agent/AgentTeam nodes and canonical handoffs", async () => {
    const plan = await buildPlanner(rootAndReviewDefinitions()).buildPlan({
      teamDefinitionId: "root-team",
      teamRunId: "root-run",
      teamConfigs: [buildTeamConfig("/"), buildTeamConfig("/ReviewTeam")],
      memberConfigs: [
        buildLeafConfig("/Lead"),
        buildLeafConfig("/ReviewTeam/Reviewer"),
        buildLeafConfig("/ReviewTeam/Approver"),
      ],
    });

    expect(plan.hasSubTeams).toBe(true);
    expect(plan.config.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(plan.config.rootTeam).toMatchObject({
      address: "/",
      teamRunId: "root-run",
      coordinatorAddress: "/Lead",
      children: [
        { kind: "agent", address: "/Lead", agentDefinitionId: "agent-lead", agentRunId: "run-agent-lead" },
        {
          kind: "agent_team",
          address: "/ReviewTeam",
          coordinatorAddress: "/ReviewTeam/Reviewer",
          children: [
            { kind: "agent", address: "/ReviewTeam/Reviewer", agentRunId: "run-agent-reviewer" },
            { kind: "agent", address: "/ReviewTeam/Approver", agentRunId: "run-agent-approver" },
          ],
        },
      ],
    });
    expect(plan.agentLaunchSettings.map((member) => member.memberAddress)).toEqual([
      "/Lead",
      "/ReviewTeam/Reviewer",
      "/ReviewTeam/Approver",
    ]);
    expect(plan.config.handoffs).toEqual([
      { from: "/Lead", to: "/ReviewTeam", rules: ["When review should begin."] },
      { from: "/ReviewTeam/Reviewer", to: "/ReviewTeam/Approver", rules: ["When a review is ready for approval."] },
    ]);
  });

  it("rejects a root-authored handoff that duplicates a rebased child handoff", async () => {
    const definitions = rootAndReviewDefinitions();
    (definitions.get("root-team") as { handoffs: unknown[] }).handoffs.push({
      from: "/ReviewTeam/Reviewer",
      to: "/ReviewTeam/Approver",
      rules: ["Root duplicate."],
    });

    await expect(buildPlanner(definitions).buildPlan({
      teamDefinitionId: "root-team",
      teamRunId: "root-run",
      teamConfigs: [buildTeamConfig("/"), buildTeamConfig("/ReviewTeam")],
      memberConfigs: [
        buildLeafConfig("/Lead"),
        buildLeafConfig("/ReviewTeam/Reviewer"),
        buildLeafConfig("/ReviewTeam/Approver"),
      ],
    })).rejects.toMatchObject({ code: "COLLABORATION_HANDOFF_DUPLICATE" });
  });

  it("requires exact addresses for duplicate leaf names instead of choosing by a bare name", async () => {
    const planner = buildPlanner(new Map([
      ["root-team", {
        name: "Root Team",
        coordinatorMemberName: "Worker",
        nodes: [
          { memberName: "Worker", refType: "agent", refScope: "shared", ref: "agent-root-worker" },
          { memberName: "SubTeam", refType: "agent_team", refScope: "shared", ref: "sub-team" },
        ],
      }],
      ["sub-team", {
        name: "Sub Team",
        coordinatorMemberName: "Worker",
        nodes: [{ memberName: "Worker", refType: "agent", refScope: "shared", ref: "agent-sub-worker" }],
      }],
    ]));

    await expect(planner.buildPlan({
      teamDefinitionId: "root-team",
      teamRunId: "root-run",
      teamConfigs: [buildTeamConfig("/"), buildTeamConfig("/SubTeam")],
      memberConfigs: [buildLeafConfig("/Worker")],
    })).rejects.toThrow("Launch settings for Team member '/SubTeam/Worker' were not provided");
  });

  it("resolves team-local subteams and agents from the containing Team definition", async () => {
    const localTeamId = buildTeamLocalTeamDefinitionId("root-team", "review-team");
    const localAgentId = buildTeamLocalAgentDefinitionId(localTeamId, "reviewer");
    const planner = buildPlanner(new Map([
      ["root-team", {
        name: "Root Team",
        coordinatorMemberName: "Lead",
        nodes: [
          { memberName: "Lead", refType: "agent", refScope: "shared", ref: "agent-lead" },
          { memberName: "ReviewTeam", refType: "agent_team", refScope: "team_local", ref: "review-team" },
        ],
      }],
      [localTeamId, {
        name: "Review Team",
        coordinatorMemberName: "Reviewer",
        nodes: [{ memberName: "Reviewer", refType: "agent", refScope: "team_local", ref: "reviewer" }],
      }],
    ]));

    const plan = await planner.buildPlan({
      teamDefinitionId: "root-team",
      teamRunId: "root-run",
      teamConfigs: [buildTeamConfig("/"), buildTeamConfig("/ReviewTeam")],
      memberConfigs: [buildLeafConfig("/Lead"), buildLeafConfig("/ReviewTeam/Reviewer")],
    });

    expect(plan.config.rootTeam.children[1]).toMatchObject({
      kind: "agent_team",
      teamDefinitionId: localTeamId,
      address: "/ReviewTeam",
      children: [{ agentDefinitionId: localAgentId, address: "/ReviewTeam/Reviewer" }],
    });
  });
});
