import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { delegationTargetUnavailableMessage } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import type {
  AgentRunCollaborationExecutionIndex,
  AgentRunCollaborationMessagePlacement,
} from "./agent-run-collaboration-execution-index.js";
import type { AgentRunCollaborationPlacement } from "./agent-run-collaboration-task-execution-adapter.js";

/**
 * Resolves Agent-root addresses by subject. Messages reach the host or a collaborator (a
 * collaborator Team through its coordinator, or one of its members); delegation targets are
 * the run's collaborators (an extra copy, REQ-013).
 */
export class AgentRunCollaborationRecipientResolver {
  resolveMessageRecipient(index: AgentRunCollaborationExecutionIndex, addressInput: string): AgentRunCollaborationMessagePlacement {
    const address = this.requireAddress(addressInput);
    const placement = index.getMessagePlacement(address);
    if (placement) return placement;
    throw new CollaborationContractError(
      "COLLABORATION_TARGET_NOT_FOUND",
      `Collaboration target '${address}' was not found in this Agent run.`,
    );
  }

  resolveDelegationPlacement(index: AgentRunCollaborationExecutionIndex, addressInput: string): AgentRunCollaborationPlacement {
    const address = this.requireAddress(addressInput);
    const collaborator = index.getCollaborator(address);
    if (collaborator?.kind === "agent_team") {
      return Object.freeze({ kind: "agent_team", address: collaborator.address, coordinatorAddress: collaborator.coordinatorAddress });
    }
    const placement = index.getMessagePlacement(address);
    if (placement?.kind === "agent" && address !== index.hostAddress) return Object.freeze({ kind: "agent", address });
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
