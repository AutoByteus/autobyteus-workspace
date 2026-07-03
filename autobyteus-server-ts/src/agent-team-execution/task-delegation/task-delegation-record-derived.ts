import type {
  TaskDelegationRecord,
  TaskReviewUpdate,
  TaskSubmissionUpdate,
} from "./task-delegation-record.js";

export const deriveTaskLabel = (content: string, fallbackTaskId: string): string => {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return fallbackTaskId;
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
};

export const listTaskSubmissionUpdates = (
  record: TaskDelegationRecord,
): TaskSubmissionUpdate[] => record.updates.filter(
  (update): update is TaskSubmissionUpdate => update.kind === "submission",
);

export const listTaskReviewUpdates = (
  record: TaskDelegationRecord,
): TaskReviewUpdate[] => record.updates.filter(
  (update): update is TaskReviewUpdate => update.kind === "review",
);

export const latestTaskSubmission = (
  record: TaskDelegationRecord,
): TaskSubmissionUpdate | null => listTaskSubmissionUpdates(record).at(-1) ?? null;

export const latestTaskReview = (
  record: TaskDelegationRecord,
): TaskReviewUpdate | null => listTaskReviewUpdates(record).at(-1) ?? null;

export const derivePendingSubmissionId = (
  record: TaskDelegationRecord,
): string | null => {
  if (record.status !== "awaiting_review") return null;
  const reviewedSubmissionIds = new Set(
    listTaskReviewUpdates(record).map((review) => review.reviewedSubmissionId),
  );
  for (const submission of listTaskSubmissionUpdates(record).slice().reverse()) {
    if (!reviewedSubmissionIds.has(submission.submissionId)) return submission.submissionId;
  }
  return null;
};

export const getTaskRecordUpdatedAt = (record: TaskDelegationRecord): string => (
  record.updates.at(-1)?.createdAt ?? record.taskRun?.startedAt ?? record.createdAt
);

export const latestAcceptanceReview = (
  record: TaskDelegationRecord,
): TaskReviewUpdate | null => {
  const latest = latestTaskReview(record);
  return latest?.decision === "accept" ? latest : null;
};
