import type { TaskExecutionInstance } from "./task-execution-instance.js";
import type { TaskDelegationPersistenceScope } from "./task-delegation-persistence-scope.js";
import type {
  TaskDelegationDelegatorIdentity,
  TaskDelegationRecord,
  TaskReferenceFile,
} from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";
import type { ConversationTargetAddress } from "../domain/conversation-target-address.js";

export type ActiveTaskDelegationStartingEntry = {
  phase: "starting";
  taskId: string;
  persistenceScope: TaskDelegationPersistenceScope;
  target: TaskDelegationTarget;
  reviewOwner: TaskDelegationDelegatorIdentity;
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  receiverTargetKind: "member" | "team";
  content: string;
  referenceFiles: TaskReferenceFile[];
  boundExecution: TaskExecutionInstance | null;
  delegatorReplyRecipientName: string | null;
  delegatorReplyTargetAgentRunId: string | null;
  createdAt: string;
};

export type ActiveTaskDelegationRecordEntry = {
  phase: "record";
  persistenceScope: TaskDelegationPersistenceScope;
  record: TaskDelegationRecord;
  target: TaskDelegationTarget;
  reviewOwner: TaskDelegationDelegatorIdentity;
  taskRunExecution: TaskExecutionInstance;
  delegatorReplyRecipientName: string | null;
  delegatorReplyTargetAgentRunId: string | null;
};

export type TaskDelegationLedgerEntry =
  | ActiveTaskDelegationStartingEntry
  | ActiveTaskDelegationRecordEntry;

export type ActiveTaskDelegationWorkEntry =
  | ActiveTaskDelegationStartingEntry
  | ActiveTaskDelegationRecordEntry;
