import { describe, expect, it, vi } from "vitest";
import { deriveTutorTargetAddress } from "../../../../applications/socratic-math-teacher/backend-src/domain/lesson-model.ts";
import { createSocraticMathGraphqlClient } from "../../../../applications/socratic-math-teacher/frontend-src/generated/graphql-client.js";

describe("Socratic lesson tutor target projection", () => {
  it("derives the shared tutor-member address only for an active usable binding", () => {
    expect(deriveTutorTargetAddress({
      status: "active",
      latestBindingId: "binding-lesson-1",
      latestBindingStatus: "ATTACHED",
    })).toEqual({
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
      })).toBeNull();
    }
    expect(deriveTutorTargetAddress({
      status: "closed",
      latestBindingId: "binding-lesson-1",
      latestBindingStatus: "ATTACHED",
    })).toBeNull();
    expect(deriveTutorTargetAddress({
      status: "active",
      latestBindingId: null,
      latestBindingStatus: null,
    })).toBeNull();
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
