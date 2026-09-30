import {
  assertAgentTeamAddress,
  getAgentTeamAddressBasename,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import {
  collaboratorAddressMessageHint,
  delegationTargetUnavailableMessage,
} from "../../agent-collaboration/collaborators/collaborator-errors.js";
import type { TeamExecutionIndex } from "./team-execution-index.js";
import {
  createResolvedAgentRecipient,
  type ResolvedTeamRecipient,
  type TeamDelegationPlacement,
} from "./resolved-team-recipient.js";

/** Resolves addresses by subject: message ingress versus delegation placement. */
export class TeamRecipientResolver {
  /** Configured Agent ingress only; a collaborator address gets a `delegate_task` hint. */
  resolveMessageRecipient(index: TeamExecutionIndex, recipientAddress: string): ResolvedTeamRecipient {
    const address = this.requireNonRootAddress(recipientAddress);
    const node = index.getConfiguredPlacement(address);
    if (node) return createResolvedAgentRecipient(node.address);
    throw new CollaborationContractError(
      "COLLABORATION_TARGET_NOT_FOUND",
      index.getCollaborator(address)
        ? collaboratorAddressMessageHint(address)
        : `Collaboration target '${address}' was not found.`,
    );
  }

  /** A configured Agent placement first, then a collaborator entry of this run. */
  resolveDelegationPlacement(index: TeamExecutionIndex, recipientAddress: string): TeamDelegationPlacement {
    const address = this.requireNonRootAddress(recipientAddress);
    const node = index.getConfiguredPlacement(address);
    if (node) return Object.freeze({ kind: "agent", address: node.address });
    const collaborator = index.getCollaborator(address);
    if (collaborator?.kind === "agent") return Object.freeze({ kind: "agent", address: collaborator.address });
    if (collaborator?.kind === "agent_team") {
      return Object.freeze({ kind: "agent_team", address: collaborator.address, coordinatorAddress: collaborator.coordinatorAddress });
    }
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
