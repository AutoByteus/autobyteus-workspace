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
};

export type LessonDetail = LessonSummary & {
  createdAt: string;
  closedAt: string | null;
};
