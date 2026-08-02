import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryIntent } from "../domain/inter-agent-message-delivery.js";
import type { TeamMemberSelector } from "../domain/team-run-member-identity.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "../domain/team-run-event.js";
import type { TeamLeafAgentStatusSnapshot } from "../domain/team-leaf-agent-status-snapshot.js";
import type { StartTaskAgentInstanceRequest } from "../domain/task-agent-instance.js";
import type { StartTaskTeamInstanceRequest } from "../domain/task-team-instance.js";
import type { ConversationTargetAddress } from "../domain/conversation-target-address.js";

export interface TeamManager {
  hasActiveMembers(): boolean;
  getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
  hasOpenExecutionWork(): boolean;
  postMessage(
    message: AgentInputUserMessage,
    target: TeamMemberSelector,
    targetMemberRunId?: string | null,
  ): Promise<AgentOperationResult>;
  postMessageToConversationTarget(
    message: AgentInputUserMessage,
    address: ConversationTargetAddress,
  ): Promise<AgentOperationResult>;
  deliverInterAgentMessage(
    intent: InterAgentMessageDeliveryIntent,
  ): Promise<AgentOperationResult>;
  approveToolInvocation(
    target: TeamMemberSelector,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
    targetMemberRunId?: string | null,
    taskTeamRunId?: string | null,
  ): Promise<AgentOperationResult>;
  interruptMember(
    targetMemberRouteKey: string,
    targetMemberRunId?: string | null,
  ): Promise<AgentOperationResult>;
  settleMember(
    targetMemberRouteKey: string,
    targetMemberRunId?: string | null,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  startTaskAgentInstance(
    request: StartTaskAgentInstanceRequest,
  ): Promise<AgentOperationResult>;
  settleTaskAgentInstance(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  startTaskTeamInstance(
    request: StartTaskTeamInstanceRequest,
  ): Promise<AgentOperationResult>;
  postMessageToTaskTeamInstance(
    logicalTeamRouteKey: string,
    taskTeamRunId: string,
    message: AgentInputUserMessage,
  ): Promise<AgentOperationResult>;
  settleTaskTeamInstance(
    logicalTeamRouteKey: string,
    taskTeamRunId: string,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  terminate(): Promise<AgentOperationResult>;
  publishEvent(event: import("../domain/team-run-event.js").TeamRunEvent): void;
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe;
}
