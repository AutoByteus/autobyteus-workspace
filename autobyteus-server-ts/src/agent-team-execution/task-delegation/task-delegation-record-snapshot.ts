import { createTeamExecutionAddress, type TeamExecutionAddress } from "../domain/team-execution-address.js";
import type { TaskDelegationRecord, TaskReferenceFile, TaskReviewUpdate, TaskRunReference, TaskSubmissionUpdate, TaskUpdate } from "./task-delegation-record.js";

export const cloneTaskExecutionAddress = (address: TeamExecutionAddress) => createTeamExecutionAddress(address);
export const cloneTaskReferenceFile = (reference: TaskReferenceFile): TaskReferenceFile => ({ ...reference });
export const cloneTaskReferenceFiles = (references: readonly TaskReferenceFile[]) => references.map(cloneTaskReferenceFile);
export const cloneTaskRunReference = (taskRun: TaskRunReference | null): TaskRunReference | null => taskRun ? { address: cloneTaskExecutionAddress(taskRun.address), startedAt: taskRun.startedAt } : null;
export const cloneTaskSubmissionUpdate = (update: TaskSubmissionUpdate): TaskSubmissionUpdate => ({ ...update, senderAddress: cloneTaskExecutionAddress(update.senderAddress), receiverAddress: cloneTaskExecutionAddress(update.receiverAddress), referenceFiles: cloneTaskReferenceFiles(update.referenceFiles) });
export const cloneTaskReviewUpdate = (update: TaskReviewUpdate): TaskReviewUpdate => ({ ...update, senderAddress: cloneTaskExecutionAddress(update.senderAddress), receiverAddress: cloneTaskExecutionAddress(update.receiverAddress), referenceFiles: cloneTaskReferenceFiles(update.referenceFiles) });
export const cloneTaskUpdate = (update: TaskUpdate): TaskUpdate => update.kind === "submission" ? cloneTaskSubmissionUpdate(update) : cloneTaskReviewUpdate(update);
export const cloneTaskDelegationRecord = (record: TaskDelegationRecord): TaskDelegationRecord => ({
  ...record,
  senderAddress: cloneTaskExecutionAddress(record.senderAddress),
  receiverAddress: cloneTaskExecutionAddress(record.receiverAddress),
  referenceFiles: cloneTaskReferenceFiles(record.referenceFiles),
  taskRun: cloneTaskRunReference(record.taskRun),
  updates: record.updates.map(cloneTaskUpdate),
});
