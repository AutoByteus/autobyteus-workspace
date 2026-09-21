import type { TaskDelegationRecordV1 } from "../../agent-collaboration/execution/task/task-delegation-record-v1.js";

export type {
  TaskExecutionReference,
  TaskDelegationStatus,
  TaskSubmission,
  TaskReview,
  TaskInterruption,
  TaskUpdate,
  TaskDelegationRecordV1,
} from "../../agent-collaboration/execution/task/task-delegation-record-v1.js";
export { isAgentTaskExecutionReference } from "../../agent-collaboration/execution/task/task-delegation-record-v1.js";

export type TaskDelegationRecordsFileV1 = Readonly<{
  schemaVersion: 1;
  rootTeamRunId: string;
  records: readonly TaskDelegationRecordV1[];
}>;
export type TaskDelegationRecordsSnapshot = TaskDelegationRecordsFileV1;
