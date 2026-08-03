import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  localizeSubTeamRunTopology,
  type TeamMemberRunConfig,
  type TeamSubTeamMemberRunConfig,
} from "../../../src/agent-team-execution/domain/team-run-config.js";

const agent = (name: string, path: string[]): TeamMemberRunConfig => ({
  memberKind: "agent",
  memberName: name,
  memberPath: path,
  memberRouteKey: path.join("/"),
  memberRunId: `run-${name}`,
  agentDefinitionId: `agent-${name}`,
  llmModelIdentifier: "test-model",
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
});

const buildResearchTeam = (): TeamSubTeamMemberRunConfig => ({
  memberKind: "agent_team",
  memberName: "research_team",
  memberPath: ["research_team"],
  memberRouteKey: "research_team",
  memberRunId: "run-research-team",
  teamDefinitionId: "research-team",
  childTeamRunId: "child-research-team",
  coordinatorMemberRouteKey: "research_team/research_lead",
  memberConfigs: [
    agent("research_lead", ["research_team", "research_lead"]),
    {
      memberKind: "agent_team",
      memberName: "field_team",
      memberPath: ["research_team", "field_team"],
      memberRouteKey: "research_team/field_team",
      memberRunId: "run-field-team",
      teamDefinitionId: "field-team",
      childTeamRunId: "child-field-team",
      coordinatorMemberRouteKey: "research_team/field_team/field_lead",
      memberConfigs: [
        agent("field_lead", ["research_team", "field_team", "field_lead"]),
        agent("interviewer", ["research_team", "field_team", "interviewer"]),
      ],
    },
  ],
});

describe("localizeSubTeamRunTopology", () => {
  it("recursively localizes every member and nested Team coordinator in one pass", () => {
    const source = buildResearchTeam();
    const result = localizeSubTeamRunTopology(source);

    expect(result.coordinatorMemberRouteKey).toBe("research_lead");
    expect(result.memberTree).toEqual([
      expect.objectContaining({
        memberKind: "agent",
        memberName: "research_lead",
        memberPath: ["research_lead"],
        memberRouteKey: "research_lead",
      }),
      expect.objectContaining({
        memberKind: "agent_team",
        memberName: "field_team",
        memberPath: ["field_team"],
        memberRouteKey: "field_team",
        coordinatorMemberRouteKey: "field_team/field_lead",
        memberConfigs: [
          expect.objectContaining({
            memberName: "field_lead",
            memberPath: ["field_team", "field_lead"],
            memberRouteKey: "field_team/field_lead",
          }),
          expect.objectContaining({
            memberName: "interviewer",
            memberPath: ["field_team", "interviewer"],
            memberRouteKey: "field_team/interviewer",
          }),
        ],
      }),
    ]);
    expect(source.coordinatorMemberRouteKey).toBe("research_team/research_lead");
    expect((source.memberConfigs[1] as TeamSubTeamMemberRunConfig).coordinatorMemberRouteKey)
      .toBe("research_team/field_team/field_lead");
  });

  it("can localize the already parent-local nested Team at the next child factory boundary", () => {
    const researchTopology = localizeSubTeamRunTopology(buildResearchTeam());
    const fieldTeam = researchTopology.memberTree[1] as TeamSubTeamMemberRunConfig;
    const fieldTopology = localizeSubTeamRunTopology(fieldTeam);

    expect(fieldTopology.coordinatorMemberRouteKey).toBe("field_lead");
    expect(fieldTopology.memberTree.map((member) => ({
      name: member.memberName,
      path: member.memberPath,
      route: member.memberRouteKey,
    }))).toEqual([
      { name: "field_lead", path: ["field_lead"], route: "field_lead" },
      { name: "interviewer", path: ["interviewer"], route: "interviewer" },
    ]);
  });

  it("rejects a descendant outside the subteam mount instead of producing a mixed namespace", () => {
    const source = buildResearchTeam();
    source.memberConfigs.push(agent("escaped", ["other_team", "escaped"]));

    expect(() => localizeSubTeamRunTopology(source)).toThrow(expect.objectContaining({
      code: "TEAM_RUN_LOCALIZATION_PREFIX_INVALID",
    }));
  });

  it("rejects a missing, non-direct, or non-Agent coordinator without prefix fallback", () => {
    const source = buildResearchTeam();
    source.coordinatorMemberRouteKey = "research_team/field_team/field_lead";

    expect(() => localizeSubTeamRunTopology(source)).toThrow(expect.objectContaining({
      code: "TEAM_RUN_COORDINATOR_INVALID",
    }));
  });
});
