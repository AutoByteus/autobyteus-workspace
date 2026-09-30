import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import {
  collaboratorAddressMessageHint,
  delegationTargetUnavailableMessage,
} from "../../agent-collaboration/collaborators/collaborator-errors.js";
import type { AgentRunCollaborationExecutionIndex } from "./agent-run-collaboration-execution-index.js";
import type { AgentRunCollaborationPlacement } from "./agent-run-collaboration-task-execution-adapter.js";

/**
 * Resolves Agent-root addresses by subject. The only message ingress by address is the host;
 * the only delegation targets are the run's collaborators.
 */
export class AgentRunCollaborationRecipientResolver {
  resolveMessageRecipient(index: AgentRunCollaborationExecutionIndex, addressInput: string): Readonly<{ agentRunId: string; address: AgentTeamAddress }> {
    const address = this.requireAddress(addressInput);
    if (address === index.hostAddress) return Object.freeze({ agentRunId: index.hostRunId, address });
    throw new CollaborationContractError(
      "COLLABORATION_TARGET_NOT_FOUND",
      index.getCollaborator(address)
        ? collaboratorAddressMessageHint(address)
        : `Collaboration target '${address}' was not found in this Agent run.`,
    );
  }

  resolveDelegationPlacement(index: AgentRunCollaborationExecutionIndex, addressInput: string): AgentRunCollaborationPlacement {
    const address = this.requireAddress(addressInput);
    const collaborator = index.getCollaborator(address);
    if (collaborator?.kind === "agent") return Object.freeze({ kind: "agent", address: collaborator.address });
    if (collaborator?.kind === "agent_team") {
      return Object.freeze({ kind: "agent_team", address: collaborator.address, coordinatorAddress: collaborator.coordinatorAddress });
    }
    throw new CollaborationContractError(
      "COLLABORATION_TARGET_NOT_FOUND",
      delegationTargetUnavailableMessage(address, index.listCollaborators().length > 0),
    );
  }

  private requireAddress(addressInput: string): AgentTeamAddress {
    const address = assertAgentTeamAddress(addressInput);
    if (address === "/") {
      throw new CollaborationContractError("COLLABORATION_ADDRESS_INVALID", "The root '/' is structural and is not a recipient.");
    }
    return address;
  }
}
