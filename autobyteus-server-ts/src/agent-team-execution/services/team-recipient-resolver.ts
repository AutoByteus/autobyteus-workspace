import { getParentAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  parseRecipientAddressExpression,
  resolveRecipientAddressExpression,
} from "../../agent-collaboration/domain/recipient-address-expression.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type { MemberLogicalAddressContext } from "../domain/member-logical-address-context.js";
import type { TeamRunTreeIndex } from "./team-run-tree-index.js";
import {
  createResolvedAgentRecipient,
  createResolvedAgentTeamRecipient,
  type ResolvedTeamRecipient,
} from "./resolved-team-recipient.js";

export class TeamRecipientResolver {
  resolve(
    index: TeamRunTreeIndex,
    recipientAddress: string,
    caller: MemberLogicalAddressContext,
  ): ResolvedTeamRecipient {
    const callerTeamAddress = getParentAgentTeamAddress(caller.memberAddress);
    if (!callerTeamAddress) {
      throw new CollaborationContractError(
        "COLLABORATION_CONTEXT_REQUIRED",
        "The caller collaboration address must identify an Agent inside an AgentTeam.",
      );
    }
    const address = resolveRecipientAddressExpression(
      parseRecipientAddressExpression(recipientAddress),
      callerTeamAddress,
    );
    const node = index.getNode(address);
    if (!node) {
      throw new CollaborationContractError(
        "COLLABORATION_TARGET_NOT_FOUND",
        `Collaboration target '${address}' was not found.`,
      );
    }
    return node.kind === "agent"
      ? createResolvedAgentRecipient(node.address)
      : createResolvedAgentTeamRecipient({
          address: node.address,
          coordinatorAddress: node.coordinatorAddress,
        });
  }
}
