import {
  assertAgentTeamAddress,
  getAgentTeamAddressBasename,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type { TeamExecutionIndex } from "./team-execution-index.js";
import {
  createResolvedAgentRecipient,
  type ResolvedTeamRecipient,
} from "./resolved-team-recipient.js";

export class TeamRecipientResolver {
  resolve(
    index: TeamExecutionIndex,
    recipientAddress: string,
  ): ResolvedTeamRecipient {
    let address;
    try {
      address = assertAgentTeamAddress(recipientAddress);
    } catch (error) {
      if (error instanceof CollaborationContractError) throw error;
      throw new CollaborationContractError(
        "COLLABORATION_ADDRESS_INVALID",
        `Recipient address '${String(recipientAddress)}' is not canonical.`,
      );
    }
    if (!getAgentTeamAddressBasename(address)) {
      throw new CollaborationContractError(
        "COLLABORATION_ADDRESS_INVALID",
        "The root AgentTeam is not a collaboration recipient; select one mounted Agent or non-root AgentTeam address.",
      );
    }
    const node = index.getConfiguredPlacement(address);
    if (!node) {
      throw new CollaborationContractError(
        "COLLABORATION_TARGET_NOT_FOUND",
        `Collaboration target '${address}' was not found.`,
      );
    }
    return createResolvedAgentRecipient(node.address);
  }
}
