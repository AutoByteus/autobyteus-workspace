import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { createMemberLogicalAddressContext } from "../../../src/agent-team-execution/domain/member-logical-address-context.js";
import {
  TeamRunConfig,
  type TeamMemberRunConfig,
  type TeamRunMemberConfig,
  type TeamSubTeamMemberRunConfig,
} from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamLogicalPlacementResolver } from "../../../src/agent-team-execution/services/team-logical-placement-resolver.js";

const agent = (name: string, path: string[]): TeamMemberRunConfig => ({
  memberKind: "agent",
  memberName: name,
  memberPath: path,
  memberRouteKey: path.join("/"),
  memberRunId: `run-${path.join("-")}`,
  role: null,
  description: null,
  agentDefinitionId: `agent-${name}`,
  llmModelIdentifier: "test-model",
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
});

const team = (
  name: string,
  path: string[],
  coordinatorPath: string[],
  members: TeamRunMemberConfig[],
): TeamSubTeamMemberRunConfig => ({
  memberKind: "agent_team",
  memberName: name,
  memberPath: path,
  memberRouteKey: path.join("/"),
  memberRunId: `run-${path.join("-")}`,
  role: null,
  description: null,
  teamDefinitionId: `team-${name}`,
  coordinatorMemberRouteKey: coordinatorPath.join("/"),
  childTeamRunId: `child-${path.join("-")}`,
  memberConfigs: members,
});

const buildRootConfig = (): TeamRunConfig => {
  const fieldTeam = team(
    "field_team",
    ["research_team", "field_team"],
    ["research_team", "field_team", "field_lead"],
    [
      agent("field_lead", ["research_team", "field_team", "field_lead"]),
      agent("team_lead", ["research_team", "field_team", "team_lead"]),
      agent("interviewer", ["research_team", "field_team", "interviewer"]),
    ],
  );
  const researchTeam = team(
    "research_team",
    ["research_team"],
    ["research_team", "research_lead"],
    [
      agent("research_lead", ["research_team", "research_lead"]),
      fieldTeam,
    ],
  );
  const designTeam = team(
    "design_team",
    ["design_team"],
    ["design_team", "team_lead"],
    [agent("team_lead", ["design_team", "team_lead"])],
  );
  return new TeamRunConfig({
    teamDefinitionId: "product-team",
    teamBackendKind: TeamBackendKind.MIXED,
    coordinatorMemberRouteKey: "product_manager",
    memberTree: [agent("product_manager", ["product_manager"]), researchTeam, designTeam],
  });
};

const rootCaller = createMemberLogicalAddressContext({
  rootTeamRunId: "root-run",
  memberPath: ["product_manager"],
  immediateTeamPath: [],
});

const nestedCaller = createMemberLogicalAddressContext({
  rootTeamRunId: "root-run",
  memberPath: ["research_team", "field_team", "interviewer"],
  immediateTeamPath: ["research_team", "field_team"],
});

describe("TeamLogicalPlacementResolver", () => {
  it("returns identical coordinate-only Agent placement for relative and absolute selectors", () => {
    const resolver = new TeamLogicalPlacementResolver();
    const config = buildRootConfig();

    const relative = resolver.resolve(config, "./research_team/field_team/interviewer", rootCaller);
    const absolute = resolver.resolve(config, "/research_team/field_team/interviewer", rootCaller);

    expect(relative).toEqual(absolute);
    expect(relative).toEqual({
      kind: "agent",
      subject: {
        absoluteAddress: "/research_team/field_team/interviewer",
        memberRouteKey: "research_team/field_team/interviewer",
      },
      owner: {
        teamPath: ["research_team", "field_team"],
        localMemberPath: ["interviewer"],
        localMemberRouteKey: "interviewer",
      },
    });
    expect(Object.isFrozen(relative)).toBe(true);
    expect(Object.isFrozen(relative.subject)).toBe(true);
    expect(Object.isFrozen(relative.owner.teamPath)).toBe(true);
    expect(relative).not.toHaveProperty("memberConfig");
    expect(relative).not.toHaveProperty("memberRunId");
    expect(relative).not.toHaveProperty("teamRunId");
    expect(relative).not.toHaveProperty("owningTeamRunId");
  });

  it("preserves a Team subject and its exact real coordinator ingress", () => {
    const placement = new TeamLogicalPlacementResolver().resolve(
      buildRootConfig(),
      "./field_team",
      createMemberLogicalAddressContext({
        rootTeamRunId: "root-run",
        memberPath: ["research_team", "research_lead"],
        immediateTeamPath: ["research_team"],
      }),
    );

    expect(placement).toEqual({
      kind: "team",
      subject: { absoluteAddress: "/research_team/field_team" },
      owner: {
        teamPath: ["research_team"],
        localMemberPath: ["field_team"],
        localMemberRouteKey: "field_team",
      },
      ingress: {
        absoluteAddress: "/research_team/field_team/field_lead",
        memberRouteKey: "research_team/field_team/field_lead",
      },
    });
  });

  it("resolves immediate and collaboration-root Team ingress without synthetic identity", () => {
    const resolver = new TeamLogicalPlacementResolver();
    const config = buildRootConfig();

    expect(resolver.resolve(config, "./", nestedCaller)).toEqual({
      kind: "team",
      subject: { absoluteAddress: "/research_team/field_team" },
      owner: {
        teamPath: ["research_team"],
        localMemberPath: ["field_team"],
        localMemberRouteKey: "field_team",
      },
      ingress: {
        absoluteAddress: "/research_team/field_team/field_lead",
        memberRouteKey: "research_team/field_team/field_lead",
      },
    });
    expect(resolver.resolve(config, "/", nestedCaller)).toEqual({
      kind: "team",
      subject: { absoluteAddress: "/" },
      owner: null,
      ingress: {
        absoluteAddress: "/product_manager",
        memberRouteKey: "product_manager",
      },
    });
  });

  it("independently resolves duplicate leaf names by their full paths", () => {
    const resolver = new TeamLogicalPlacementResolver();
    const config = buildRootConfig();

    const fieldLead = resolver.resolve(config, "/research_team/field_team/team_lead", nestedCaller);
    const designLead = resolver.resolve(config, "/design_team/team_lead", nestedCaller);

    expect(fieldLead.subject.absoluteAddress).toBe("/research_team/field_team/team_lead");
    expect(designLead.subject.absoluteAddress).toBe("/design_team/team_lead");
    expect(fieldLead).not.toEqual(designLead);
  });

  it.each([
    ["team_lead", "COLLABORATION_ADDRESS_INVALID"],
    ["../team_lead", "COLLABORATION_ADDRESS_INVALID"],
    ["/design_team//team_lead", "COLLABORATION_ADDRESS_INVALID"],
    ["/design_team/", "COLLABORATION_ADDRESS_INVALID"],
    ["/design_team\\team_lead", "COLLABORATION_ADDRESS_INVALID"],
    ["/missing", "COLLABORATION_TARGET_NOT_FOUND"],
    ["/product_manager/child", "COLLABORATION_TRAVERSAL_INVALID"],
  ])("rejects %s with typed code %s", (recipientName, code) => {
    expect(() => new TeamLogicalPlacementResolver().resolve(
      buildRootConfig(),
      recipientName,
      nestedCaller,
    )).toThrow(expect.objectContaining({ code }));
  });
});
