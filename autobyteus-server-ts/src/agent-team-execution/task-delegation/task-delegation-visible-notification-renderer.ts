import type { ActiveTaskDelegationWorkEntry } from "./task-delegation-active-entry.js";
import type {
  TaskReferenceFile,
  TaskResultReview,
  TaskResultSubmission,
} from "./task-delegation-record.js";

const renderReferenceFiles = (referenceFiles: readonly (string | TaskReferenceFile)[]): string =>
  referenceFiles.length > 0
    ? referenceFiles.map((referenceFile) => `- ${typeof referenceFile === "string" ? referenceFile : referenceFile.path}`).join("\n")
    : "- None specified";

const entryTaskId = (entry: ActiveTaskDelegationWorkEntry): string => (
  entry.phase === "record" ? entry.record.taskId : entry.taskId
);

const entryContent = (entry: ActiveTaskDelegationWorkEntry): string => (
  entry.phase === "record" ? entry.record.content : entry.content
);

const entryReferenceFiles = (entry: ActiveTaskDelegationWorkEntry): TaskReferenceFile[] => (
  entry.phase === "record" ? entry.record.referenceFiles : entry.referenceFiles
);

export class TaskDelegationVisibleNotificationRenderer {
  renderActivation(entry: ActiveTaskDelegationWorkEntry): string {
    return [
      "You have a new task.",
      "",
      `Task ID: ${entryTaskId(entry)}`,
      "",
      "Task:",
      entryContent(entry),
      "",
      "Reference files:",
      renderReferenceFiles(entryReferenceFiles(entry)),
    ].join("\n");
  }

  renderResultSubmitted(entry: ActiveTaskDelegationWorkEntry, submission: TaskResultSubmission): string {
    return [
      "A task result is ready for review.",
      "",
      `Task ID: ${entryTaskId(entry)}`,
      "Task:",
      entryContent(entry),
      "",
      "Submitted result:",
      submission.content,
      "",
      "Reference files:",
      renderReferenceFiles(submission.referenceFiles),
    ].join("\n");
  }

  renderRevisionRequested(entry: ActiveTaskDelegationWorkEntry, review: TaskResultReview): string {
    return [
      "This task needs revision.",
      "",
      `Task ID: ${entryTaskId(entry)}`,
      "Task:",
      entryContent(entry),
      "",
      "Review comment:",
      review.content ?? "",
      "",
      "Reference files:",
      renderReferenceFiles(review.referenceFiles),
    ].join("\n");
  }
}
