// Frozen verbatim copy (import paths remapped only) of `src/agent-team-execution/task-delegation/task-delegation-record-v1.ts` as released at
// origin/personal@f2924a2b0. Owned by released app-data migrations; current runtime must not import it.
import type { TaskDelegationRecordV1 } from "./task-delegation-record-v1.js";

export type {
  TaskExecutionReference,
  TaskDelegationStatus,
  TaskSubmission,
  TaskReview,
  TaskInterruption,
  TaskUpdate,
  TaskDelegationRecordV1,
} from "./task-delegation-record-v1.js";
export { isAgentTaskExecutionReference } from "./task-delegation-record-v1.js";

export type TaskDelegationRecordsFileV1 = Readonly<{
  schemaVersion: 1;
  rootTeamRunId: string;
  records: readonly TaskDelegationRecordV1[];
}>;
export type TaskDelegationRecordsSnapshot = TaskDelegationRecordsFileV1;
