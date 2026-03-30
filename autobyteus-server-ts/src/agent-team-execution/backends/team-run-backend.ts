import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { InterAgentMessageDeliveryRequest } from "../domain/inter-agent-message-delivery.js";
import type { RuntimeTeamRunContext } from "../domain/team-run-context.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "../domain/team-run-event.js";

export interface TeamRunBackend {
  readonly runId: string;
  readonly runtimeKind: RuntimeKind;

  getRuntimeContext(): RuntimeTeamRunContext | null;
  isActive(): boolean;
  getStatus(): string | null;
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe;
  postMessage(
    message: AgentInputUserMessage,
    targetMemberName?: string | null,
  ): Promise<AgentOperationResult>;
  deliverInterAgentMessage(
    request: InterAgentMessageDeliveryRequest,
  ): Promise<AgentOperationResult>;
  approveToolInvocation(
    targetMemberName: string,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  interrupt(): Promise<AgentOperationResult>;
  terminate(): Promise<AgentOperationResult>;
}
