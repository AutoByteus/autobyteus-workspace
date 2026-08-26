import { describe, expect, it } from "vitest";
import type { ApplicationAgentTeamBinding } from "@autobyteus/application-backend-sdk";
import { deriveTutorTargetAddress } from "../../../../applications/socratic-math-teacher/backend-src/domain/lesson-model.ts";

const activeLesson = {
  status: "active" as const,
  latestBindingId: "binding-lesson-1",
  latestBindingStatus: "ATTACHED",
};

const buildBinding = (memberAddress: `/${string}` = "/tutor"): ApplicationAgentTeamBinding => ({
  bindingId: "binding-lesson-1",
  applicationId: "socratic-math-teacher",
  launchRequestId: "lesson-launch-request-1",
  status: "ATTACHED",
  executionResourceRef: {
    source: "bundle",
    kind: "AGENT_TEAM",
    localId: "socratic-math-team",
  },
  runtime: {
    subject: "TEAM_RUN",
    teamRunId: "team-run-lesson-1",
    definitionId: "socratic-math-team",
    members: [{
      memberAddress,
      displayName: "Tutor",
      agentRunId: "team-run-lesson-1::tutor-current-identity",
    }],
  },
  createdAt: "2026-08-22T12:00:00.000Z",
  updatedAt: "2026-08-22T12:00:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
});

describe("Socratic tutor target address", () => {
  it("selects the configured /tutor member without exposing its physical Agent run ID", () => {
    expect(deriveTutorTargetAddress(activeLesson, buildBinding())).toEqual({
      bindingId: "binding-lesson-1",
      memberAddress: "/tutor",
    });
  });

  it("rejects an attached team binding that lacks the configured /tutor member", () => {
    expect(() => deriveTutorTargetAddress(activeLesson, buildBinding("/other-member"))).toThrow(
      "Application agent-team binding 'binding-lesson-1' does not contain memberAddress '/tutor'.",
    );
  });
});
