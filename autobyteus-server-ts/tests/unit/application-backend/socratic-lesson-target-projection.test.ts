import { describe, expect, it, vi } from "vitest";
import type {
  ApplicationAgentBinding,
  ApplicationAgentTeamBinding,
} from "@autobyteus/application-backend-sdk";
import { deriveTutorTargetAddress } from "../../../../applications/socratic-math-teacher/backend-src/domain/lesson-model.ts";
import { createSocraticMathGraphqlClient } from "../../../../applications/socratic-math-teacher/frontend-src/generated/graphql-client.js";

const bindingFields = {
  bindingId: "binding-lesson-1",
  applicationId: "socratic-math-teacher",
  launchRequestId: "lesson-launch-request-1",
  status: "ATTACHED" as const,
  executionResourceRef: {
    source: "bundle" as const,
    kind: "AGENT_TEAM" as const,
    localId: "socratic-math-team",
  },
  createdAt: "2026-07-22T12:00:00.000Z",
  updatedAt: "2026-07-22T12:00:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
};

const buildTeamBinding = (
  overrides: Partial<Pick<ApplicationAgentTeamBinding, "status">> = {},
): ApplicationAgentTeamBinding => ({
  ...bindingFields,
  ...overrides,
  runtime: {
    subject: "TEAM_RUN",
    runId: "team-run-lesson-1",
    definitionId: "socratic-math-team",
    members: [{
      memberName: "tutor",
      memberRouteKey: "tutor",
      displayName: "Tutor",
      teamPath: [],
      runId: "team-run-lesson-1::tutor",
      runtimeKind: "AGENT_TEAM_MEMBER",
    }],
  },
});

const activeLesson = {
  status: "active" as const,
  latestBindingId: "binding-lesson-1",
  latestBindingStatus: "ATTACHED",
};

describe("Socratic lesson tutor target projection", () => {
  it("derives the shared tutor-member address from the authoritative active team binding", () => {
    expect(deriveTutorTargetAddress(activeLesson, buildTeamBinding())).toEqual({
      bindingId: "binding-lesson-1",
      target: {
        kind: "AGENT_TEAM_MEMBER",
        memberRouteKey: "tutor",
      },
    });

    for (const latestBindingStatus of ["TERMINATING", "FAILED", "TERMINATED", "ORPHANED"]) {
      expect(deriveTutorTargetAddress({
        status: "active",
        latestBindingId: "binding-lesson-1",
        latestBindingStatus,
      }, buildTeamBinding())).toBeNull();
    }
    expect(deriveTutorTargetAddress({
      status: "closed",
      latestBindingId: "binding-lesson-1",
      latestBindingStatus: "ATTACHED",
    }, buildTeamBinding())).toBeNull();
    expect(deriveTutorTargetAddress({
      status: "active",
      latestBindingId: null,
      latestBindingStatus: null,
    }, buildTeamBinding())).toBeNull();
    expect(deriveTutorTargetAddress(activeLesson, null)).toBeNull();
    expect(deriveTutorTargetAddress(activeLesson, buildTeamBinding({ status: "TERMINATING" }))).toBeNull();
  });

  it("surfaces wrong binding subjects and missing tutor membership as configuration defects", () => {
    const agentBinding: ApplicationAgentBinding = {
      ...bindingFields,
      executionResourceRef: {
        source: "bundle",
        kind: "AGENT",
        localId: "wrong-agent",
      },
      runtime: {
        subject: "AGENT_RUN",
        runId: "agent-run-1",
        definitionId: "wrong-agent",
        members: [],
      },
    };
    const teamWithoutTutor = buildTeamBinding();
    teamWithoutTutor.runtime.members[0] = {
      ...teamWithoutTutor.runtime.members[0]!,
      memberRouteKey: "other-member",
    };

    expect(() => deriveTutorTargetAddress(activeLesson, agentBinding)).toThrow(
      "Socratic tutor binding must be an agent-team binding.",
    );
    expect(() => deriveTutorTargetAddress(activeLesson, teamWithoutTutor)).toThrow(
      "Application agent-team binding 'binding-lesson-1' does not contain memberRouteKey 'tutor'.",
    );
  });

  it("requests and carries the shared target address through the generated GraphQL client", async () => {
    const tutorTargetAddress = {
      bindingId: "binding-lesson-1",
      target: { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "tutor" },
    };
    const graphql = vi.fn(async () => ({
      data: {
        startLesson: {
          lessonId: "lesson-1",
          tutorTargetAddress,
        },
      },
    }));
    const client = createSocraticMathGraphqlClient({
      getApplicationInfo: vi.fn(),
      backend: { graphql },
      notifications: { subscribe: vi.fn() },
    });

    await expect(client.startLesson({ prompt: "Solve 3x + 5 = 20" })).resolves.toEqual({
      lessonId: "lesson-1",
      tutorTargetAddress,
    });
    expect(graphql).toHaveBeenCalledWith(expect.objectContaining({
      query: expect.stringContaining("tutorTargetAddress"),
      operationName: "StartLessonMutation",
    }));
  });
});
