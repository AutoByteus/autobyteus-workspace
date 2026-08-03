import type { MemberCollaborationContext } from "../../agent-team-execution/domain/member-collaboration-context.js";
import type { AgentCommunicationToolResultEnvelope } from "./agent-communication-tool-result.js";
import { communicationRejection } from "./agent-communication-tool-result.js";

export type GetHandoffRulesResult = {
  member_address: string;
  handoffs: Array<{ from: string; to: string; rules: string[] }>;
};

export class GetHandoffRulesService {
  getRules(
    collaboration: MemberCollaborationContext | null | undefined,
  ): AgentCommunicationToolResultEnvelope<GetHandoffRulesResult> {
    if (!collaboration) {
      return communicationRejection(
        "COLLABORATION_CONTEXT_REQUIRED",
        "get_handoff_rules requires an active Team collaboration context.",
      );
    }
    const handoffs = collaboration.outgoingHandoffs.map((handoff) => ({
      from: handoff.from,
      to: handoff.to,
      rules: [...handoff.rules],
    }));
    return {
      accepted: true,
      code: "HANDOFF_RULES_RETRIEVED",
      message: `Retrieved ${handoffs.length} outgoing handoff rule edge${handoffs.length === 1 ? "" : "s"}.`,
      result: {
        member_address: collaboration.addressing.memberAddress,
        handoffs,
      },
    };
  }
}

let cachedService: GetHandoffRulesService | null = null;
export const getGetHandoffRulesService = (): GetHandoffRulesService =>
  cachedService ??= new GetHandoffRulesService();
