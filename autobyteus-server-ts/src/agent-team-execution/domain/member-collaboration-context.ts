import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import {
  cloneCollaborationHandoffs,
  type CollaborationHandoff,
} from "../../agent-collaboration/domain/collaboration-handoff.js";
import {
  cloneMemberLogicalAddressContext,
  type MemberLogicalAddressContext,
} from "./member-logical-address-context.js";
import type { InterAgentMessageDeliveryIntent } from "./inter-agent-message-delivery.js";

export type MemberLogicalMessageDeliveryHandler = (
  intent: InterAgentMessageDeliveryIntent,
) => Promise<AgentOperationResult>;

export class MemberCollaborationContext {
  readonly addressing: MemberLogicalAddressContext;
  readonly outgoingHandoffs: readonly CollaborationHandoff[];
  readonly deliverInterAgentMessage: MemberLogicalMessageDeliveryHandler | null;

  constructor(input: {
    addressing: MemberLogicalAddressContext;
    outgoingHandoffs?: readonly CollaborationHandoff[] | null;
    deliverInterAgentMessage?: MemberLogicalMessageDeliveryHandler | null;
  }) {
    this.addressing = cloneMemberLogicalAddressContext(input.addressing);
    this.outgoingHandoffs = Object.freeze(
      cloneCollaborationHandoffs(input.outgoingHandoffs ?? []),
    );
    this.deliverInterAgentMessage = input.deliverInterAgentMessage ?? null;
  }
}
