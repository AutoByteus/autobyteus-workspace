import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  buildTeamLocalAgentDefinitionId,
  buildTeamLocalTeamDefinitionId,
} from "autobyteus-ts/agent-team/utils/team-local-definition-id.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamDefinitionTopologyPlanner } from "../../../src/agent-team-execution/services/team-definition-topology-planner.js";

const buildPlanner = (definitions: Map<string, unknown>): TeamDefinitionTopologyPlanner =>
  new TeamDefinitionTopologyPlanner({
    getDefinitionById: vi.fn(async (id: string) => definitions.get(id) ?? null),
  } as any);

const buildLeafConfig = (memberName: string, memberRouteKey?: string) => ({
  memberName,
  memberRouteKey,
  agentDefinitionId: `agent-${memberName}`,
  llmModelIdentifier: "gpt-test",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  workspaceRootPath: "/tmp/workspace",
  llmConfig: null,
});

describe("TeamDefinitionTopologyPlanner", () => {
  it("routes nested agent_team definitions to mixed and preserves recursive member topology", async () => {
    const planner = buildPlanner(new Map([
      [
        "root-team",
        {
          name: "Root Team",
          coordinatorMemberName: "Lead",
          nodes: [
            { memberName: "Lead", refType: "agent", refScope: "shared", ref: "agent-lead" },
            { memberName: "ReviewTeam", refType: "agent_team", refScope: "shared", ref: "review-team" },
          ],
        },
      ],
      [
        "review-team",
        {
          name: "Review Team",
          coordinatorMemberName: "Reviewer",
          nodes: [
            { memberName: "Reviewer", refType: "agent", refScope: "shared", ref: "agent-reviewer" },
          ],
        },
      ],
    ]));

    const plan = await planner.buildPlan({
      teamDefinitionId: "root-team",
      memberConfigs: [
        buildLeafConfig("Lead", "Lead"),
        buildLeafConfig("Reviewer", "ReviewTeam/Reviewer"),
      ],
    });

    expect(plan.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(plan.hasSubTeams).toBe(true);
    expect(plan.memberTree).toEqual([
      expect.objectContaining({
        memberKind: "agent",
        memberName: "Lead",
        memberPath: ["Lead"],
        memberRouteKey: "Lead",
      }),
      expect.objectContaining({
        memberKind: "agent_team",
        memberName: "ReviewTeam",
        memberPath: ["ReviewTeam"],
        memberRouteKey: "ReviewTeam",
        memberConfigs: [
          expect.objectContaining({
            memberKind: "agent",
            memberName: "Reviewer",
            memberPath: ["ReviewTeam", "Reviewer"],
            memberRouteKey: "ReviewTeam/Reviewer",
          }),
        ],
      }),
    ]);
    expect(plan.config.memberTree).toHaveLength(2);
    expect(plan.config.memberConfigs.map((member) => member.memberRouteKey)).toEqual([
      "Lead",
      "ReviewTeam/Reviewer",
    ]);
  });

  it("rejects ambiguous bare leaf configs when nested members repeat a name", async () => {
    const planner = buildPlanner(new Map([
      [
        "root-team",
        {
          name: "Root Team",
          coordinatorMemberName: "Worker",
          nodes: [
            { memberName: "Worker", refType: "agent", refScope: "shared", ref: "agent-root-worker" },
            { memberName: "SubTeam", refType: "agent_team", refScope: "shared", ref: "sub-team" },
          ],
        },
      ],
      [
        "sub-team",
        {
          name: "Sub Team",
          coordinatorMemberName: "Worker",
          nodes: [
            { memberName: "Worker", refType: "agent", refScope: "shared", ref: "agent-sub-worker" },
          ],
        },
      ],
    ]));

    await expect(planner.buildPlan({
      teamDefinitionId: "root-team",
      memberConfigs: [buildLeafConfig("Worker")],
    })).rejects.toThrow("ambiguous");
  });

  it("resolves team-local subteams and their local agents from the containing team id", async () => {
    const localTeamId = buildTeamLocalTeamDefinitionId("root-team", "review-team");
    const localAgentId = buildTeamLocalAgentDefinitionId(localTeamId, "reviewer");
    const planner = buildPlanner(new Map([
      [
        "root-team",
        {
          name: "Root Team",
          coordinatorMemberName: "Lead",
          nodes: [
            { memberName: "Lead", refType: "agent", refScope: "shared", ref: "agent-lead" },
            { memberName: "ReviewTeam", refType: "agent_team", refScope: "team_local", ref: "review-team" },
          ],
        },
      ],
      [
        localTeamId,
        {
          name: "Review Team",
          coordinatorMemberName: "Reviewer",
          nodes: [
            { memberName: "Reviewer", refType: "agent", refScope: "team_local", ref: "reviewer" },
          ],
        },
      ],
    ]));

    const plan = await planner.buildPlan({
      teamDefinitionId: "root-team",
      memberConfigs: [
        buildLeafConfig("Lead", "Lead"),
        buildLeafConfig("Reviewer", "ReviewTeam/Reviewer"),
      ],
    });

    expect(plan.memberTree[1]).toEqual(expect.objectContaining({
      memberKind: "agent_team",
      teamDefinitionId: localTeamId,
      memberRouteKey: "ReviewTeam",
    }));
    expect(plan.config.memberConfigs.find((member) => member.memberName === "Reviewer")).toEqual(
      expect.objectContaining({
        memberRouteKey: "ReviewTeam/Reviewer",
        agentDefinitionId: localAgentId,
      }),
    );
  });
});
