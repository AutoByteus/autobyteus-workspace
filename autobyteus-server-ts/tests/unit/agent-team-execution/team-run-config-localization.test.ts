import { describe, expect, it } from "vitest";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { testAgentNode, testAgentTeamNode } from "../../fixtures/current-team-run-fixtures.js";

const buildResearchRoot = () => {
  const fieldTeam = testAgentTeamNode({
    address: "/research_team/field_team",
    coordinatorAddress: "/research_team/field_team/field_lead",
    teamRunId: "child-field-team",
    children: [
      testAgentNode("/research_team/field_team/field_lead"),
      testAgentNode("/research_team/field_team/interviewer"),
    ],
  });
  const researchTeam = testAgentTeamNode({
    address: "/research_team",
    coordinatorAddress: "/research_team/research_lead",
    teamRunId: "child-research-team",
    children: [testAgentNode("/research_team/research_lead"), fieldTeam],
  });
  return testAgentTeamNode({
    address: "/",
    coordinatorAddress: "/root_lead",
    teamRunId: "root-run",
    children: [testAgentNode("/root_lead"), researchTeam],
  });
};

describe("TeamRunConfig exact rooted topology", () => {
  it("clones and freezes every recursive Agent/AgentTeam address without localization", () => {
    const source = buildResearchRoot();
    const config = new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam: source,
    });

    expect(config.rootTeam.children[1]).toMatchObject({
      address: "/research_team",
      coordinatorAddress: "/research_team/research_lead",
      children: [
        { address: "/research_team/research_lead" },
        {
          address: "/research_team/field_team",
          coordinatorAddress: "/research_team/field_team/field_lead",
          children: [
            { address: "/research_team/field_team/field_lead" },
            { address: "/research_team/field_team/interviewer" },
          ],
        },
      ],
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.rootTeam.children)).toBe(true);
  });

  it("keeps the same canonical root-visible addresses at every child factory boundary", () => {
    const config = new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam: buildResearchRoot(),
    });
    const research = config.rootTeam.children[1];
    const field = research.kind === "agent_team" ? research.children[1] : null;

    expect(research).toMatchObject({ address: "/research_team" });
    expect(field).toMatchObject({ address: "/research_team/field_team" });
    expect(field && field.kind === "agent_team" ? field.children.map((node) => node.address) : [])
      .toEqual([
        "/research_team/field_team/field_lead",
        "/research_team/field_team/interviewer",
      ]);
  });

  it("rejects a descendant outside its exact parent AgentTeam address", () => {
    const root = buildResearchRoot();
    const research = root.children[1];
    if (research.kind !== "agent_team") throw new Error("research fixture is not an AgentTeam");
    const invalidResearch = { ...research, children: [...research.children, testAgentNode("/other_team/escaped")] };

    expect(() => new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam: { ...root, children: [root.children[0]!, invalidResearch] },
    })).toThrow("is not a direct child of AgentTeam '/research_team'");
  });

  it("rejects a missing, nested, or non-Agent coordinator without prefix fallback", () => {
    const root = buildResearchRoot();
    const research = root.children[1];
    if (research.kind !== "agent_team") throw new Error("research fixture is not an AgentTeam");
    const invalidResearch = {
      ...research,
      coordinatorAddress: "/research_team/field_team/field_lead" as typeof research.coordinatorAddress,
    };

    expect(() => new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam: { ...root, children: [root.children[0]!, invalidResearch] },
    })).toThrow("must have exactly one direct Agent coordinator '/research_team/field_team/field_lead'");
  });
});
