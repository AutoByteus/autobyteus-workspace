import type { ApplicationAgentTargetAddress } from "@autobyteus/application-backend-sdk";

export type LessonStatus = "active" | "closed" | "blocked";

export type LessonSummary = {
  lessonId: string;
  prompt: string;
  status: LessonStatus;
  latestBindingId: string | null;
  latestRunId: string | null;
  latestBindingStatus: string | null;
  lastErrorMessage: string | null;
  updatedAt: string;
  artifactCatchupCompletedAt?: string | null;
};

export type LessonRecord = LessonSummary & {
  createdAt: string;
  closedAt: string | null;
};

export type LessonDetail = LessonRecord & {
  tutorTargetAddress: ApplicationAgentTargetAddress | null;
};

const UNUSABLE_BINDING_STATUSES = new Set(["TERMINATING", "TERMINATED", "FAILED", "ORPHANED"]);

export const deriveTutorTargetAddress = (lesson: Pick<
  LessonSummary,
  "status" | "latestBindingId" | "latestBindingStatus"
>): ApplicationAgentTargetAddress | null => {
  if (lesson.status !== "active" || !lesson.latestBindingId || (
    lesson.latestBindingStatus
    && UNUSABLE_BINDING_STATUSES.has(lesson.latestBindingStatus)
  )) {
    return null;
  }

  return {
    bindingId: lesson.latestBindingId,
    target: {
      kind: "AGENT_TEAM_MEMBER",
      memberRouteKey: "tutor",
    },
  };
};
