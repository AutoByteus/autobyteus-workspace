import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { createMemberLogicalAddressContext } from "../../../src/agent-team-execution/domain/member-logical-address-context.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import {
  createResolvedAgentPlacement,
  createResolvedAgentTeamPlacement,
} from "../../../src/agent-team-execution/services/resolved-team-logical-placement.js";
import { TaskDelegationTargetMapper } from "../../../src/agent-team-execution/task-delegation/task-delegation-target-mapper.js";

const agent = (name: string, route = name): TeamMemberRunConfig => ({
  memberKind: "agent",
  memberName: name,
  memberPath: route.split("/"),
  memberRouteKey: route,
  memberRunId: `run-${name}`,
  role: `${name}-role`,
  description: `${name}-description`,
  agentDefinitionId: `agent-${name}`,
  llmModelIdentifier: "test-model",
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

const buildCurrentResearchConfig = () => new TeamRunConfig({
  teamDefinitionId: "research-team",
  teamBackendKind: TeamBackendKind.MIXED,
  coordinatorMemberRouteKey: "research_lead",
  memberTree: [
    agent("research_lead"),
    agent("analyst"),
    {
      memberKind: "agent_team",
      memberName: "field_team",
      memberPath: ["field_team"],
      memberRouteKey: "field_team",
      memberRunId: "run-field-team",
      teamDefinitionId: "field-team",
      childTeamRunId: "child-field-team",
      coordinatorMemberRouteKey: "field_team/field_lead",
      memberConfigs: [agent("field_lead", "field_team/field_lead")],
    },
  ],
});

const addressing = createMemberLogicalAddressContext({
  rootTeamRunId: "root-run",
  memberPath: ["research_team", "research_lead"],
  immediateTeamPath: ["research_team"],
});

const caller = {
  memberKind: "agent" as const,
  memberName: "research_lead",
  memberPath: ["research_lead"],
  memberRouteKey: "research_lead",
  memberRunId: "run-research_lead",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
};

describe("TaskDelegationTargetMapper", () => {
  it("maps a direct Agent placement to current-Team execution identity", () => {
    const placement = createResolvedAgentPlacement({
      subject: {
        absoluteAddress: "/research_team/analyst",
        memberRouteKey: "research_team/analyst",
      },
      owner: {
        teamPath: ["research_team"],
        localMemberPath: ["analyst"],
        localMemberRouteKey: "analyst",
      },
    });

    expect(new TaskDelegationTargetMapper().fromPlacement(
      placement,
      addressing,
      buildCurrentResearchConfig(),
      caller,
    )).toEqual({
      kind: "member",
      member: expect.objectContaining({
        memberKind: "agent",
        memberName: "analyst",
        memberPath: ["analyst"],
        memberRouteKey: "analyst",
        memberRunId: "run-analyst",
        logicalAddress: "/research_team/analyst",
      }),
    });
  });

  it("maps a direct Team placement through its exact localized real coordinator", () => {
    const placement = createResolvedAgentTeamPlacement({
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

    expect(new TaskDelegationTargetMapper().fromPlacement(
      placement,
      addressing,
      buildCurrentResearchConfig(),
      caller,
    )).toEqual({
      kind: "team",
      team: expect.objectContaining({
        memberKind: "agent_team",
        memberName: "field_team",
        memberPath: ["field_team"],
        memberRouteKey: "field_team",
        memberRunId: "run-field-team",
        teamDefinitionId: "field-team",
        logicalAddress: "/research_team/field_team",
        ingress: expect.objectContaining({
          memberName: "field_lead",
          memberPath: ["field_team", "field_lead"],
          memberRouteKey: "field_team/field_lead",
          memberRunId: "run-field_lead",
        }),
      }),
    });
  });

  it("rejects a valid cross-branch or deeper placement before task activation identity exists", () => {
    const placement = createResolvedAgentPlacement({
      subject: {
        absoluteAddress: "/design_team/designer",
        memberRouteKey: "design_team/designer",
      },
      owner: {
        teamPath: ["design_team"],
        localMemberPath: ["designer"],
        localMemberRouteKey: "designer",
      },
    });

    expect(() => new TaskDelegationTargetMapper().fromPlacement(
      placement,
      addressing,
      buildCurrentResearchConfig(),
      caller,
    )).toThrow(expect.objectContaining({ code: "TASK_DELEGATION_TARGET_NOT_ELIGIBLE" }));
  });

  it("rejects the caller Agent even when its direct current-Team config matches", () => {
    const placement = createResolvedAgentPlacement({
      subject: {
        absoluteAddress: "/research_team/research_lead",
        memberRouteKey: "research_team/research_lead",
      },
      owner: {
        teamPath: ["research_team"],
        localMemberPath: ["research_lead"],
        localMemberRouteKey: "research_lead",
      },
    });

    expect(() => new TaskDelegationTargetMapper().fromPlacement(
      placement,
      addressing,
      buildCurrentResearchConfig(),
      caller,
    )).toThrow(expect.objectContaining({ code: "TASK_DELEGATION_SELF_TARGET_NOT_ALLOWED" }));
  });

  it("does not retry a root-prefixed coordinator when current-local topology is inconsistent", () => {
    const config = buildCurrentResearchConfig();
    const fieldTeam = config.memberTree[2];
    if (!fieldTeam || fieldTeam.memberKind !== "agent_team") throw new Error("fixture invalid");
    fieldTeam.coordinatorMemberRouteKey = "research_team/field_team/field_lead";
    const placement = createResolvedAgentTeamPlacement({
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

    expect(() => new TaskDelegationTargetMapper().fromPlacement(
      placement,
      addressing,
      config,
      caller,
    )).toThrow(expect.objectContaining({ code: "TASK_TEAM_TARGET_INGRESS_NOT_FOUND" }));
  });
});
