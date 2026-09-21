import type {
  TaskDelegationRecordV1,
  TaskReview,
  TaskSubmission,
} from "./task-delegation-record-v1.js";

export type RootTaskLifecycleEvent =
  | Readonly<{ kind: "activated"; task: TaskDelegationRecordV1 }>
  | Readonly<{ kind: "submitted"; task: TaskDelegationRecordV1; submission: TaskSubmission }>
  | Readonly<{ kind: "reviewed"; task: TaskDelegationRecordV1; review: TaskReview }>
  | Readonly<{ kind: "settled"; task: TaskDelegationRecordV1; settledAt: string }>;
