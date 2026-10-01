import {
  assertAgentTeamAddress,
  getAgentTeamAddressBasename,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { delegationTargetUnavailableMessage } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import type { TeamExecutionIndex, TeamMessagePlacement } from "./team-execution-index.js";
import type { TeamDelegationPlacement } from "./resolved-team-recipient.js";

/** Resolves addresses by subject: message ingress versus delegation placement. */
export class TeamRecipientResolver {
  /**
   * The one execution a message reaches: a configured Agent, then a collaborator Agent, a
   * collaborator Team (its coordinator) or a collaborator Team member. The first message
   * starts a collaborator.
   */
  resolveMessageRecipient(index: TeamExecutionIndex, recipientAddress: string): TeamMessagePlacement {
    const address = this.requireNonRootAddress(recipientAddress);
    const placement = index.getMessagePlacement(address);
    if (placement) return placement;
    throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `Collaboration target '${address}' was not found.`);
  }

  /**
   * A configured Agent placement first, then a collaborator of this run (or a member of a
   * collaborator Team). Delegating there starts an extra copy (REQ-013).
   */
  resolveDelegationPlacement(index: TeamExecutionIndex, recipientAddress: string): TeamDelegationPlacement {
    const address = this.requireNonRootAddress(recipientAddress);
    const node = index.getConfiguredPlacement(address);
    if (node) return Object.freeze({ kind: "agent", address: node.address });
    const collaborator = index.getCollaborator(address);
    if (collaborator?.kind === "agent_team") {
      return Object.freeze({ kind: "agent_team", address: collaborator.address, coordinatorAddress: collaborator.coordinatorAddress });
    }
    if (index.getMessagePlacement(address)?.kind === "agent") return Object.freeze({ kind: "agent", address });
    throw new CollaborationContractError(
      "COLLABORATION_TARGET_NOT_FOUND",
      delegationTargetUnavailableMessage(address, true),
    );
  }

  private requireNonRootAddress(recipientAddress: string): AgentTeamAddress {
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
