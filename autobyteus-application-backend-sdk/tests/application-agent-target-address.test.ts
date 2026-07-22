import { describe, expect, it } from "vitest";
import type {
  ApplicationAgentBinding,
  ApplicationAgentTeamBinding,
} from "@autobyteus/application-sdk-contracts";
import {
  createApplicationAgentTargetAddress,
  createApplicationAgentTeamMemberTargetAddress,
  createApplicationAgentTeamTargetAddress,
} from "../src/index.js";

const bindingFields = {
  bindingId: "  binding-1  ",
  applicationId: "application-1",
  launchRequestId: "launch-request-1",
  status: "ATTACHED" as const,
  executionResourceRef: {
    source: "bundle" as const,
    kind: "AGENT_TEAM" as const,
    localId: "resource-1",
  },
  createdAt: "2026-07-22T12:00:00.000Z",
  updatedAt: "2026-07-22T12:00:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
};

const buildAgentBinding = (): ApplicationAgentBinding => ({
  ...bindingFields,
  executionResourceRef: {
    source: "bundle",
    kind: "AGENT",
    localId: "agent-resource-1",
  },
  runtime: {
    subject: "AGENT_RUN",
    runId: "agent-run-1",
    definitionId: "agent-definition-1",
    members: [],
  },
});

const buildTeamBinding = (): ApplicationAgentTeamBinding => ({
  ...bindingFields,
  runtime: {
    subject: "TEAM_RUN",
    runId: "team-run-1",
    definitionId: "team-definition-1",
    members: [
      {
        memberName: "tutor-name",
        memberRouteKey: "tutor",
        displayName: "Tutor Display Name",
        teamPath: [],
        runId: "team-run-1::tutor",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
    ],
  },
});

describe("application agent target-address builders", () => {
  it("returns exact fresh canonical addresses without mutating either precise binding", () => {
    const agentBinding = buildAgentBinding();
    const teamBinding = buildTeamBinding();
    const originalAgentBinding = structuredClone(agentBinding);
    const originalTeamBinding = structuredClone(teamBinding);

    const firstAgentAddress = createApplicationAgentTargetAddress(agentBinding);
    const secondAgentAddress = createApplicationAgentTargetAddress(agentBinding);
    const firstTeamAddress = createApplicationAgentTeamTargetAddress(teamBinding);
    const secondTeamAddress = createApplicationAgentTeamTargetAddress(teamBinding);
    const firstMemberAddress = createApplicationAgentTeamMemberTargetAddress(teamBinding, "  tutor  ");
    const secondMemberAddress = createApplicationAgentTeamMemberTargetAddress(teamBinding, "tutor");

    expect(firstAgentAddress).toEqual({
      bindingId: "binding-1",
      target: { kind: "AGENT_RUN" },
    });
    expect(firstTeamAddress).toEqual({
      bindingId: "binding-1",
      target: { kind: "AGENT_TEAM_RUN" },
    });
    expect(firstMemberAddress).toEqual({
      bindingId: "binding-1",
      target: { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "tutor" },
    });

    for (const [first, second] of [
      [firstAgentAddress, secondAgentAddress],
      [firstTeamAddress, secondTeamAddress],
      [firstMemberAddress, secondMemberAddress],
    ]) {
      expect(first).not.toBe(second);
      expect(first.target).not.toBe(second.target);
    }
    expect(agentBinding).toEqual(originalAgentBinding);
    expect(teamBinding).toEqual(originalTeamBinding);
  });

  it.each([
    ["agent", (binding: unknown) => createApplicationAgentTargetAddress(binding as ApplicationAgentBinding)],
    ["team", (binding: unknown) => createApplicationAgentTeamTargetAddress(binding as ApplicationAgentTeamBinding)],
    ["team member", (binding: unknown) => createApplicationAgentTeamMemberTargetAddress(
      binding as ApplicationAgentTeamBinding,
      "tutor",
    )],
  ])("rejects a missing or blank binding ID for the %s builder before other validation", (_name, buildAddress) => {
    expect(() => buildAddress({ runtime: { subject: "WRONG" } })).toThrow(
      "Application agent target address requires binding.bindingId.",
    );
    expect(() => buildAddress({ bindingId: "   ", runtime: { subject: "WRONG" } })).toThrow(
      "Application agent target address requires binding.bindingId.",
    );
  });

  it("rejects runtime-subject mismatches with the exact builder-specific errors", () => {
    expect(() => createApplicationAgentTargetAddress(
      buildTeamBinding() as unknown as ApplicationAgentBinding,
    )).toThrow("Application agent target address requires an AGENT_RUN binding.");
    expect(() => createApplicationAgentTeamTargetAddress(
      buildAgentBinding() as unknown as ApplicationAgentTeamBinding,
    )).toThrow("Application agent-team target address requires a TEAM_RUN binding.");
    expect(() => createApplicationAgentTeamMemberTargetAddress(
      buildAgentBinding() as unknown as ApplicationAgentTeamBinding,
      "tutor",
    )).toThrow("Application agent-team target address requires a TEAM_RUN binding.");
  });

  it("rejects blank and unknown member keys without falling back to other member identities", () => {
    const binding = buildTeamBinding();

    expect(() => createApplicationAgentTeamMemberTargetAddress(binding, "   ")).toThrow(
      "Application agent-team member target address requires memberRouteKey.",
    );
    for (const invalidKey of ["unknown", "tutor-name", "Tutor Display Name", "team-run-1::tutor"]) {
      expect(() => createApplicationAgentTeamMemberTargetAddress(binding, invalidKey)).toThrow(
        `Application agent-team binding 'binding-1' does not contain memberRouteKey '${invalidKey}'.`,
      );
    }
  });
});
