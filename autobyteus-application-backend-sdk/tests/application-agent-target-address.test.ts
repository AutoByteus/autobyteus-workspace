import { describe, expect, it } from "vitest";
import type {
  ApplicationAgentBinding,
  ApplicationAgentTeamBinding,
} from "@autobyteus/application-sdk-contracts";
import {
  createApplicationAgentTargetAddress,
  createApplicationAgentTeamMemberTargetAddress,
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
    agentRunId: "agent-run-1",
    definitionId: "agent-definition-1",
    members: [],
  },
});

const buildTeamBinding = (): ApplicationAgentTeamBinding => ({
  ...bindingFields,
  runtime: {
    subject: "TEAM_RUN",
    teamRunId: "team-run-1",
    definitionId: "team-definition-1",
    members: [
      {
        memberAddress: "/research/reviewer",
        displayName: "Reviewer",
        agentRunId: "team-run-1::reviewer",
      },
      {
        memberAddress: "/tutor",
        displayName: "Tutor Display Name",
        agentRunId: "team-run-1::tutor",
      },
    ],
  },
});

describe("application agent target-address builders", () => {
  it("builds fresh root addresses for either binding without exposing physical run identity", () => {
    const agentBinding = buildAgentBinding();
    const teamBinding = buildTeamBinding();
    const originalAgentBinding = structuredClone(agentBinding);
    const originalTeamBinding = structuredClone(teamBinding);

    const firstAgentAddress = createApplicationAgentTargetAddress(agentBinding);
    const secondAgentAddress = createApplicationAgentTargetAddress(agentBinding);
    const firstTeamAddress = createApplicationAgentTargetAddress(teamBinding);
    const secondTeamAddress = createApplicationAgentTargetAddress(teamBinding);

    expect(firstAgentAddress).toEqual({ bindingId: "binding-1", memberAddress: null });
    expect(firstTeamAddress).toEqual({ bindingId: "binding-1", memberAddress: null });
    expect(firstAgentAddress).not.toBe(secondAgentAddress);
    expect(firstTeamAddress).not.toBe(secondTeamAddress);
    expect(agentBinding).toEqual(originalAgentBinding);
    expect(teamBinding).toEqual(originalTeamBinding);
  });

  it("selects canonical nested members by exact logical address", () => {
    const binding = buildTeamBinding();
    expect(createApplicationAgentTeamMemberTargetAddress(binding, "/research/reviewer")).toEqual({
      bindingId: "binding-1",
      memberAddress: "/research/reviewer",
    });
    expect(createApplicationAgentTeamMemberTargetAddress(binding, "/tutor")).toEqual({
      bindingId: "binding-1",
      memberAddress: "/tutor",
    });
  });

  it.each([
    ["root", (binding: unknown) => createApplicationAgentTargetAddress(binding as ApplicationAgentBinding)],
    ["team member", (binding: unknown) => createApplicationAgentTeamMemberTargetAddress(
      binding as ApplicationAgentTeamBinding,
      "/tutor",
    )],
  ])("rejects a missing or blank binding ID for the %s builder before other validation", (_name, buildAddress) => {
    expect(() => buildAddress({ runtime: { subject: "WRONG" } })).toThrow(
      "Application agent target address requires binding.bindingId.",
    );
    expect(() => buildAddress({ bindingId: "   ", runtime: { subject: "WRONG" } })).toThrow(
      "Application agent target address requires binding.bindingId.",
    );
  });

  it("rejects unsupported root and member runtime subjects", () => {
    expect(() => createApplicationAgentTargetAddress({
      ...buildAgentBinding(),
      runtime: { subject: "WRONG" },
    } as unknown as ApplicationAgentBinding)).toThrow(
      "Application agent target address requires an AGENT_RUN or TEAM_RUN binding.",
    );
    expect(() => createApplicationAgentTeamMemberTargetAddress(
      buildAgentBinding() as unknown as ApplicationAgentTeamBinding,
      "/tutor",
    )).toThrow("Application agent-team target address requires a TEAM_RUN binding.");
  });

  it("rejects non-canonical, unknown, display-label, and physical-ID member selectors", () => {
    const binding = buildTeamBinding();

    for (const invalidAddress of ["", "   ", "tutor", "/tutor/", "/research//reviewer", "/research/../reviewer"]) {
      expect(() => createApplicationAgentTeamMemberTargetAddress(binding, invalidAddress as `/${string}`)).toThrow(
        "Application agent-team member target requires a canonical memberAddress.",
      );
    }
    for (const unknownAddress of ["/unknown", "/Tutor Display Name", "/team-run-1::tutor"]) {
      expect(() => createApplicationAgentTeamMemberTargetAddress(binding, unknownAddress as `/${string}`)).toThrow(
        `Application agent-team binding 'binding-1' does not contain memberAddress '${unknownAddress}'.`,
      );
    }
  });
});
