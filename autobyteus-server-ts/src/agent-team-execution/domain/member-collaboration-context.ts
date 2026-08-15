import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import {
  cloneCollaborationHandoffs,
  type CollaborationHandoff,
} from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { InterAgentMessageDeliveryIntent } from "./inter-agent-message-delivery.js";

export type MemberLogicalMessageDeliveryHandler = (
  intent: InterAgentMessageDeliveryIntent,
) => Promise<AgentOperationResult>;

export class MemberCollaborationContext {
  readonly outgoingHandoffs: readonly CollaborationHandoff[];
  readonly deliverInterAgentMessage: MemberLogicalMessageDeliveryHandler | null;

  constructor(input: {
    outgoingHandoffs?: readonly CollaborationHandoff[] | null;
    deliverInterAgentMessage?: MemberLogicalMessageDeliveryHandler | null;
  }) {
    this.outgoingHandoffs = Object.freeze(
      cloneCollaborationHandoffs(input.outgoingHandoffs ?? []),
    );
    this.deliverInterAgentMessage = input.deliverInterAgentMessage ?? null;
  }
}
