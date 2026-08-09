import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createMemberLogicalAddressContext } from "../../../src/agent-team-execution/domain/member-logical-address-context.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import {
  createResolvedAgentRecipient,
  createResolvedAgentTeamRecipient,
} from "../../../src/agent-team-execution/services/resolved-team-recipient.js";
import { TaskDelegationTargetMapper } from "../../../src/agent-team-execution/task-delegation/task-delegation-target-mapper.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const config = testTeamRunConfig({
  coordinatorAddress: "/research_lead",
  rootTeamRunId: "root-run",
  rootTeamDefinitionId: "research-team",
  children: [
    testAgentNode("/research_lead", {
      agentRunId: "run-research-lead",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentNode("/analyst", {
      agentRunId: "run-analyst",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentTeamNode({
      address: "/field_team",
      coordinatorAddress: "/field_team/field_lead",
      teamRunId: "run-field-team",
      teamDefinitionId: "field-team",
      children: [testAgentNode("/field_team/field_lead", {
        agentRunId: "run-field-lead",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      })],
    }),
  ],
});

const currentTeam = new TeamRunContext({
  teamRunId: "root-run",
  teamAddress: "/",
  teamBackendKind: TeamBackendKind.MIXED,
  config,
  runtimeContext: null,
});
const addressing = createMemberLogicalAddressContext({
  rootTeamRunId: "root-run",
  memberAddress: "/research_lead",
});
const caller = {
  executionAddress: createTeamExecutionAddress({
    rootTeamRunId: "root-run",
    taskTeamRunIds: [],
    memberAddress: "/research_lead",
  }),
  agentRunId: "run-research-lead",
};

const map = (recipient: Parameters<TaskDelegationTargetMapper["fromRecipient"]>[0]) =>
  new TaskDelegationTargetMapper().fromRecipient(recipient, addressing, currentTeam, caller);

describe("TaskDelegationTargetMapper", () => {
  it("maps a direct Agent recipient to the unchanged canonical target", () => {
    const recipient = createResolvedAgentRecipient("/analyst");
    expect(map(recipient)).toBe(recipient);
    expect(map(recipient)).toEqual({ kind: "agent", address: "/analyst" });
  });

  it("maps a direct AgentTeam recipient only with its exact configured coordinator", () => {
    const recipient = createResolvedAgentTeamRecipient({
      address: "/field_team",
      coordinatorAddress: "/field_team/field_lead",
    });
    expect(map(recipient)).toBe(recipient);
    expect(map(recipient)).toEqual({
      kind: "agent_team",
      address: "/field_team",
      coordinatorAddress: "/field_team/field_lead",
    });
  });

  it("rejects a valid deeper recipient before task activation identity exists", () => {
    expect(() => map(createResolvedAgentRecipient("/field_team/field_lead")))
      .toThrow(expect.objectContaining({ code: "TASK_DELEGATION_TARGET_NOT_ELIGIBLE" }));
  });

  it("rejects the caller Agent even when its direct current-Team node matches", () => {
    expect(() => map(createResolvedAgentRecipient("/research_lead")))
      .toThrow(expect.objectContaining({ code: "TASK_DELEGATION_SELF_TARGET_NOT_ALLOWED" }));
  });

  it("does not retry or derive a coordinator when the recipient ingress is inconsistent", () => {
    expect(() => map(createResolvedAgentTeamRecipient({
      address: "/field_team",
      coordinatorAddress: "/field_team/missing",
    }))).toThrow(expect.objectContaining({ code: "TASK_TEAM_TARGET_INGRESS_NOT_FOUND" }));
  });

  it("rejects an AgentTeam ingress outside the resolved Team", () => {
    expect(() => map(createResolvedAgentTeamRecipient({
      address: "/field_team",
      coordinatorAddress: "/analyst",
    }))).toThrow(expect.objectContaining({ code: "TASK_TEAM_TARGET_INGRESS_NOT_FOUND" }));
  });
});
