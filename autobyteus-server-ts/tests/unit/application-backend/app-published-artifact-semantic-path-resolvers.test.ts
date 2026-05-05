import { describe, expect, it } from "vitest";
import { resolveBriefArtifactPathRule } from "../../../../applications/brief-studio/backend-src/services/brief-artifact-paths.ts";
import { resolveLessonArtifactPathRule } from "../../../../applications/socratic-math-teacher/backend-src/services/lesson-artifact-paths.ts";

describe("app published-artifact semantic path resolvers", () => {
  it("resolves Brief Studio artifacts from absolute paths while preserving canonical app roles", () => {
    expect(resolveBriefArtifactPathRule("researcher", "/tmp/downloads/brief-studio/research.md")).toMatchObject({
      publicationKind: "research",
      path: "brief-studio/research.md",
    });
    expect(resolveBriefArtifactPathRule("writer", "/tmp/downloads/final-brief.md")).toMatchObject({
      publicationKind: "final",
      path: "brief-studio/final-brief.md",
      readyForReview: true,
    });
    expect(resolveBriefArtifactPathRule("writer", "C:\\Users\\agent\\Downloads\\brief-studio\\brief-draft.md")).toMatchObject({
      publicationKind: "draft",
      path: "brief-studio/brief-draft.md",
    });
  });

  it("resolves Brief Studio artifacts from relative historical paths through the same semantic rules", () => {
    expect(resolveBriefArtifactPathRule("researcher", "brief-studio/research.md")).toMatchObject({
      publicationKind: "research",
      path: "brief-studio/research.md",
    });
    expect(resolveBriefArtifactPathRule("writer", "brief-studio/final-brief.md")).toMatchObject({
      publicationKind: "final",
      path: "brief-studio/final-brief.md",
      readyForReview: true,
    });
  });

  it("rejects unrecognized Brief Studio artifact filenames for the producer", () => {
    expect(() =>
      resolveBriefArtifactPathRule("researcher", "/tmp/downloads/final-brief.md"),
    ).toThrow("Unexpected Brief Studio artifact path '/tmp/downloads/final-brief.md' for producer 'researcher'.");
  });

  it("resolves Socratic Math artifacts from absolute paths while preserving canonical lesson roles", () => {
    expect(resolveLessonArtifactPathRule("/tmp/downloads/socratic-math/lesson-response.md")).toMatchObject({
      messageKind: "lesson_response",
      path: "socratic-math/lesson-response.md",
    });
    expect(resolveLessonArtifactPathRule("/tmp/downloads/lesson-hint.md")).toMatchObject({
      messageKind: "lesson_hint",
      path: "socratic-math/lesson-hint.md",
      notificationTopic: "lesson.hint_received",
    });
  });

  it("resolves Socratic Math artifacts from relative historical paths through the same semantic rules", () => {
    expect(resolveLessonArtifactPathRule("socratic-math/lesson-response.md")).toMatchObject({
      messageKind: "lesson_response",
      path: "socratic-math/lesson-response.md",
      notificationTopic: "lesson.response_received",
    });
    expect(resolveLessonArtifactPathRule("socratic-math/lesson-hint.md")).toMatchObject({
      messageKind: "lesson_hint",
      path: "socratic-math/lesson-hint.md",
      notificationTopic: "lesson.hint_received",
    });
  });
});
