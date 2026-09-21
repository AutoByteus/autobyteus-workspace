import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import type { RootTaskLifecycleEvent } from "./root-task-lifecycle-event.js";
import type {
  TaskDelegationRecordV1,
  TaskExecutionReference,
} from "./task-delegation-record-v1.js";

export type PreparedRootTaskActivation = Readonly<{
  recipientAddress: import("../../domain/agent-team-address.js").AgentTeamAddress;
  taskExecution: TaskExecutionReference;
  targetAgentRunId: string;
  commit(input: Readonly<{
    task: TaskDelegationRecordV1;
    nextRecords: readonly TaskDelegationRecordV1[];
    event: RootTaskLifecycleEvent;
    commitRecords(): void;
  }>): Promise<Readonly<{ committed: true }> | Readonly<{ committed: false; message: string }>>;
  abort(): Promise<void>;
}>;

export type RootTaskActivationPreparation<TPlacement> = Readonly<{
  identity: CollaborationMemberExecutionIdentity;
  placement: TPlacement;
  taskId: string;
  description: string;
  referenceFiles: readonly string[];
  startedAt: string;
  workPacket: AgentInputUserMessage;
}>;

/** Subject-private port. The shared engine never sees a Team/Org tree, store, index, or event. */
export interface RootTaskLifecycleAdapter<TPlacement> {
  readonly initialRecords: readonly TaskDelegationRecordV1[];
  isOpen(): boolean;
  authorize(identity: CollaborationMemberExecutionIdentity): void;
  assertCurrentSchemaReady(): void;
  prepareActivation(input: RootTaskActivationPreparation<TPlacement>): Promise<PreparedRootTaskActivation>;
  commitRecordTransition(input: Readonly<{
    previous: TaskDelegationRecordV1;
    next: TaskDelegationRecordV1;
    nextRecords: readonly TaskDelegationRecordV1[];
    event: RootTaskLifecycleEvent | null;
    commitRecords(): void;
  }>): Promise<void>;
  taskAssigneeAgentRunId(task: TaskDelegationRecordV1): string;
  taskOwnsAgent(task: TaskDelegationRecordV1, agentRunId: string): boolean;
  isTaskExecutionSettled(task: TaskDelegationRecordV1): boolean;
  settleTaskExecution(input: Readonly<{
    task: TaskDelegationRecordV1;
    currentRecords: readonly TaskDelegationRecordV1[];
    settledAt: string;
    remainsBlockedByOpenChild(): boolean;
    event: RootTaskLifecycleEvent;
  }>): Promise<boolean>;
  enterLifecycleFailStop(): void;
  deliverSystemMessage(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult>;
}
