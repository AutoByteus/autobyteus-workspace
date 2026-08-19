import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type { MemberCollaborationContext } from "../../agent-team-execution/domain/member-collaboration-context.js";

export type HandoffInstruction = Readonly<{ when: string; recipient_address: AgentTeamAddress }>;
export type GetHandoffRulesResult = Readonly<{ handoffs: readonly HandoffInstruction[] }>;

export class GetHandoffRulesService {
  getRules(collaboration: MemberCollaborationContext | null | undefined): GetHandoffRulesResult {
    if (!collaboration) throw new CollaborationContractError(
      "COLLABORATION_CONTEXT_REQUIRED",
      "get_handoff_rules requires an active Team collaboration context.",
    );
    return Object.freeze({
      handoffs: Object.freeze(collaboration.outgoingHandoffs.flatMap((handoff) =>
        handoff.rules.map((when) => Object.freeze({ when, recipient_address: handoff.to as AgentTeamAddress })),
      )),
    });
  }
}

let cachedService: GetHandoffRulesService | null = null;
export const getGetHandoffRulesService = () => cachedService ??= new GetHandoffRulesService();
