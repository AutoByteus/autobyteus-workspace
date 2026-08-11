import type { TeamExecutionAddress } from "../domain/team-execution-address.js";
import type { ActiveTaskExecutionBinding } from "./active-task-execution-binding.js";
import type { TaskDelegationPersistenceScope } from "./task-delegation-persistence-scope.js";
import type { TaskDelegationDelegatorIdentity, TaskDelegationRecord, TaskReferenceFile } from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";

export type ActiveTaskDelegationStartingEntry = {
  phase: "starting";
  taskId: string;
  persistenceScope: TaskDelegationPersistenceScope;
  target: TaskDelegationTarget;
  reviewOwner: TaskDelegationDelegatorIdentity;
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
  receiverTargetKind: "agent" | "agent_team";
  content: string;
  referenceFiles: TaskReferenceFile[];
  boundExecution: ActiveTaskExecutionBinding | null;
  delegatorReplyRecipientAddress: string | null;
  delegatorReplyTargetAgentRunId: string | null;
  createdAt: string;
};

export type ActiveTaskDelegationRecordEntry = {
  phase: "record";
  persistenceScope: TaskDelegationPersistenceScope;
  record: TaskDelegationRecord;
  target: TaskDelegationTarget;
  reviewOwner: TaskDelegationDelegatorIdentity;
  activeExecution: ActiveTaskExecutionBinding;
  delegatorReplyRecipientAddress: string | null;
  delegatorReplyTargetAgentRunId: string | null;
};
export type TaskDelegationLedgerEntry = ActiveTaskDelegationStartingEntry | ActiveTaskDelegationRecordEntry;
export type ActiveTaskDelegationWorkEntry = TaskDelegationLedgerEntry;
