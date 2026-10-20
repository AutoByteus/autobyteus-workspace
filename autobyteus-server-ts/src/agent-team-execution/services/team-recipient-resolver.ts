import {
  assertAgentTeamAddress,
  getAgentTeamAddressBasename,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { delegationTargetUnavailableMessage } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import { sourcedPlacement } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import { configuredPlacementSource } from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { TeamExecutionIndex } from "./team-execution-index.js";
import type { TeamDelegationPlacement } from "./resolved-team-recipient.js";

/**
 * Team-root address rules: canonical non-root recipients, and the in-run delegation
 * placements. Message resolution is the shared `MessageRecipientResolution`.
 */
export class TeamRecipientResolver {
  /**
   * A configured Agent placement outside the sender's own Team (CM-1 is checked before this), with the
   * snapshot its copy starts from: the placement as it is now.
   */
  resolveInRunDelegationPlacement(index: TeamExecutionIndex, address: AgentTeamAddress): TeamDelegationPlacement {
    const node = index.getConfiguredPlacement(address);
    if (node) return sourcedPlacement(node.address, configuredPlacementSource(node, index.tree.handoffs));
    throw new CollaborationContractError(
      "COLLABORATION_TARGET_NOT_FOUND",
      delegationTargetUnavailableMessage(address),
    );
  }

  requireNonRootAddress(recipientAddress: string): AgentTeamAddress {
    let address: AgentTeamAddress;
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
    return address;
  }
}
