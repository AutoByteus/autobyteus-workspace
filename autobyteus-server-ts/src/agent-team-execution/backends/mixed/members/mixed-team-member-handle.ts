import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { AgentTeamAddress } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { TeamLeafAgentStatusSnapshot } from "../../../domain/team-leaf-agent-status-snapshot.js";
import type { ResolvedInterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";
import type { TeamRunEvent, TeamRunEventUnsubscribe } from "../../../domain/team-run-event.js";
import type { MixedTeamMemberContext } from "../mixed-team-run-context.js";

export interface MixedTeamMemberHandle {
  readonly context: MixedTeamMemberContext;
  isActive(): boolean;
  getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
  hasOpenExecutionWork(): boolean;
  postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult>;
  postMessageToAddress(
    message: AgentInputUserMessage,
    target: AgentTeamAddress,
    targetAgentRunId?: string | null,
  ): Promise<AgentOperationResult>;
  deliverInterMemberMessage(
    request: ResolvedInterAgentMessageDeliveryRequest,
    beforePublishMemberInput?: (() => void) | null,
  ): Promise<AgentOperationResult>;
  approveToolInvocation(
    target: AgentTeamAddress | null,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
    targetAgentRunId?: string | null,
  ): Promise<AgentOperationResult>;
  interrupt(target: AgentTeamAddress | null, targetAgentRunId?: string | null): Promise<AgentOperationResult>;
  terminate(): Promise<AgentOperationResult>;
  dispose(): void;
}

export type MixedTeamEventPublish = (event: TeamRunEvent) => void;
export type MixedTeamUnsubscribe = TeamRunEventUnsubscribe;
