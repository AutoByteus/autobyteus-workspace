import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type {
  InterAgentMessageDeliveryIntent,
  ResolvedInterAgentMessageDeliveryRequest,
} from "../domain/inter-agent-message-delivery.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "../domain/team-run-event.js";
import type { TeamAgentStatusSnapshot } from "../domain/team-agent-status.js";
import type { StartTaskAgentExecutionRequest } from "../domain/task-agent-execution.js";
import type { StartTaskTeamExecutionRequest } from "../domain/task-team-execution.js";
import type { MemberLogicalAddressContext } from "../domain/member-logical-address-context.js";
import type { ResolvedTeamRecipient } from "../services/resolved-team-recipient.js";
import type { TeamExecutionAddress } from "../domain/team-execution-address.js";
import type { TeamMemberExecutionCommand } from "../domain/team-member-execution-command.js";
import type { TaskActivationEventLease } from "../services/task-activation-event-barrier.js";

export interface TeamManager {
  hasActiveMembers(): boolean;
  getLeafAgentStatusSnapshots(): TeamAgentStatusSnapshot[];
  hasOpenExecutionWork(): boolean;
  postMessage(
    message: AgentInputUserMessage,
    target: AgentTeamAddress,
    targetAgentRunId?: string | null,
  ): Promise<AgentOperationResult>;
  executeMemberCommand(
    executionAddress: TeamExecutionAddress,
    command: TeamMemberExecutionCommand,
  ): Promise<AgentOperationResult>;
  deliverInterAgentMessage(
    intent: InterAgentMessageDeliveryIntent,
  ): Promise<AgentOperationResult>;
  deliverResolvedInterAgentMessage(
    request: ResolvedInterAgentMessageDeliveryRequest,
    beforePublishMemberInput?: (() => void) | null,
  ): Promise<AgentOperationResult>;
  resolveRecipient(
    recipientAddress: string,
    callerAddressing: MemberLogicalAddressContext,
  ): ResolvedTeamRecipient;
  approveToolInvocation(
    target: AgentTeamAddress,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
    targetAgentRunId?: string | null,
    taskTeamRunId?: string | null,
  ): Promise<AgentOperationResult>;
  interruptMember(
    target: AgentTeamAddress,
    targetAgentRunId?: string | null,
  ): Promise<AgentOperationResult>;
  settleMember(
    target: AgentTeamAddress,
    targetAgentRunId?: string | null,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  startTaskAgentExecution(
    request: StartTaskAgentExecutionRequest,
  ): Promise<AgentOperationResult>;
  releaseTaskAgentExecutionWork(target: AgentTeamAddress, taskAgentRunId: string): void;
  settleTaskAgentExecution(
    target: AgentTeamAddress,
    taskAgentRunId: string,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  startTaskTeamExecution(
    request: StartTaskTeamExecutionRequest,
  ): Promise<AgentOperationResult>;
  markTaskTeamExecutionActive(taskTeamRunId: string): void;
  releaseTaskTeamExecutionWork(target: AgentTeamAddress, taskTeamRunId: string): void;
  postMessageToTaskTeamExecution(
    target: AgentTeamAddress,
    taskTeamRunId: string,
    message: AgentInputUserMessage,
  ): Promise<AgentOperationResult>;
  settleTaskTeamExecution(
    target: AgentTeamAddress,
    taskTeamRunId: string,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  terminate(): Promise<AgentOperationResult>;
  publishEvent(event: import("../domain/team-run-event.js").TeamRunEvent): void;
  openTaskActivationEventLease(executionAddress: TeamExecutionAddress): TaskActivationEventLease;
  assertTaskActivationEventLeaseWithinBudget(lease: TaskActivationEventLease): void;
  commitTaskActivationEventLease(lease: TaskActivationEventLease, activationEvent: import("../domain/team-run-event.js").TeamRunEvent): void;
  abortTaskActivationEventLease(lease: TaskActivationEventLease): void;
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe;
}
