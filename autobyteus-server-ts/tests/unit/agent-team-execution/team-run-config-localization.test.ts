import { describe, expect, it } from "vitest";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { testAgentNode, testAgentTeamNode } from "../../fixtures/current-team-run-fixtures.js";

/** A flat root Team: its members are Agents directly under it. */
const buildResearchTeam = () => testAgentTeamNode({
  address: "/",
  coordinatorAddress: "/research_lead",
  teamRunId: "research-team-run",
  children: [
    testAgentNode("/research_lead"),
    testAgentNode("/interviewer"),
  ],
});

describe("TeamRunConfig exact rooted topology", () => {
  it("clones and freezes every Agent address without localization", () => {
    const config = new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam: buildResearchTeam(),
    });

    expect(config.rootTeam).toMatchObject({
      address: "/",
      coordinatorAddress: "/research_lead",
      children: [
        { kind: "agent", address: "/research_lead" },
        { kind: "agent", address: "/interviewer" },
      ],
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.rootTeam.children)).toBe(true);
  });

  it("rejects a member outside its exact parent AgentTeam address", () => {
    const team = buildResearchTeam();
    expect(() => new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam: { ...team, children: [...team.children, testAgentNode("/other_team/escaped")] },
    })).toThrow("is not a direct child of AgentTeam '/'");
    expect(() => new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam: { ...team, children: [...team.children, testAgentNode("/interviewer/escaped")] },
    })).toThrow("is not a direct child of AgentTeam '/'");
  });

  it("rejects a missing or non-direct coordinator without prefix fallback", () => {
    const team = buildResearchTeam();
    expect(() => new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam: { ...team, coordinatorAddress: "/field/field_lead" as typeof team.coordinatorAddress },
    })).toThrow("must have exactly one direct Agent coordinator '/field/field_lead'");
  });
});
