import type {
  TaskDelegationRecord,
  TaskResultReview,
  TaskResultSubmission,
} from "./task-delegation-record.js";
import { getTaskDelegationTargetName } from "./task-delegation-target.js";

const renderReferenceFiles = (referenceFiles: readonly string[]): string =>
  referenceFiles.length > 0
    ? referenceFiles.map((referenceFile) => `- ${referenceFile}`).join("\n")
    : "- None specified";

export class TaskDelegationVisibleNotificationRenderer {
  renderActivation(record: TaskDelegationRecord): string {
    const targetLines = record.target.kind === "team"
      ? ["Accountable team:", getTaskDelegationTargetName(record.target), ""]
      : [];

    return [
      record.target.kind === "team" ? "New delegated team task." : "New delegated task.",
      "",
      `Task ID: ${record.taskId}`,
      ...targetLines,
      "Task:",
      record.description,
      "",
      "Reference files:",
      renderReferenceFiles(record.referenceFiles),
    ].join("\n");
  }

  renderResultSubmitted(record: TaskDelegationRecord, submission: TaskResultSubmission): string {
    return [
      "A task result is ready for review.",
      "",
      `Task ID: ${record.taskId}`,
      "Task:",
      record.description,
      "",
      "Submitted result:",
      submission.message,
      "",
      "Reference files:",
      renderReferenceFiles(submission.referenceFiles),
    ].join("\n");
  }

  renderRevisionRequested(record: TaskDelegationRecord, review: TaskResultReview): string {
    return [
      "This task needs revision.",
      "",
      `Task ID: ${record.taskId}`,
      "Task:",
      record.description,
      "",
      "Review comment:",
      review.comment ?? "",
      "",
      "Reference files:",
      renderReferenceFiles(review.referenceFiles),
    ].join("\n");
  }
}
