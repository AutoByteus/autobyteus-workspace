import type { LessonMessageKind } from "../domain/lesson-message-model.js";

export type LessonArtifactPathRule = {
  path: string;
  messageKind: Extract<LessonMessageKind, "lesson_response" | "lesson_hint">;
  notificationTopic: "lesson.response_received" | "lesson.hint_received";
};

const PATH_RULES: Record<string, LessonArtifactPathRule> = {
  "socratic-math/lesson-response.md": {
    path: "socratic-math/lesson-response.md",
    messageKind: "lesson_response",
    notificationTopic: "lesson.response_received",
  },
  "socratic-math/lesson-hint.md": {
    path: "socratic-math/lesson-hint.md",
    messageKind: "lesson_hint",
    notificationTopic: "lesson.hint_received",
  },
};

export const resolveLessonArtifactPathRule = (artifactPath: string): LessonArtifactPathRule => {
  const normalizedPath = artifactPath.replace(/\\/g, "/").trim();
  const rule = PATH_RULES[normalizedPath];
  if (!rule) {
    throw new Error(`Unexpected Socratic Math Teacher artifact path '${artifactPath}'.`);
  }
  return rule;
};
