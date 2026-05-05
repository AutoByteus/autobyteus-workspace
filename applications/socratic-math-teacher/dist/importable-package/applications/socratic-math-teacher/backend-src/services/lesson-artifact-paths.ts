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

const normalizeArtifactPath = (artifactPath: string): string =>
  artifactPath.replace(/\\/g, "/").trim();

const basenameOf = (normalizedPath: string): string => {
  const segments = normalizedPath.split("/").filter((segment) => segment.length > 0);
  return segments.at(-1) ?? normalizedPath;
};

const BASENAME_RULES: Record<string, LessonArtifactPathRule> = Object.fromEntries(
  Object.values(PATH_RULES).map((rule) => [basenameOf(rule.path), rule]),
);

const extractSocraticMathSuffix = (normalizedPath: string): string | null => {
  const appFolderMarker = "/socratic-math/";
  const markerIndex = normalizedPath.lastIndexOf(appFolderMarker);
  if (markerIndex < 0) {
    return normalizedPath.startsWith("socratic-math/") ? normalizedPath : null;
  }
  return normalizedPath.slice(markerIndex + 1);
};

export const resolveLessonArtifactPathRule = (artifactPath: string): LessonArtifactPathRule => {
  const normalizedPath = normalizeArtifactPath(artifactPath);
  const suffixPath = extractSocraticMathSuffix(normalizedPath);
  const rule = PATH_RULES[normalizedPath]
    ?? (suffixPath ? PATH_RULES[suffixPath] : undefined)
    ?? BASENAME_RULES[basenameOf(normalizedPath)];
  if (!rule) {
    throw new Error(`Unexpected Socratic Math Teacher artifact path '${artifactPath}'.`);
  }
  return rule;
};
