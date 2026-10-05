import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { delegationTargetUnavailableMessage } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import { resolveDelegationPlacement } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import {
  resolveMessageRecipient,
  type MessageRecipientResult,
} from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentRunCollaborationExecutionIndex } from "./agent-run-collaboration-execution-index.js";
import type { AgentRunCollaborationCollaborators } from "./agent-run-collaboration-collaborators.js";
import type { AgentRunCollaborationPlacement } from "./agent-run-collaboration-task-execution-adapter.js";

/**
 * Resolves Agent-root addresses by subject (DS-002, DS-003). Called inside the root operation
 * gate, so a catalog bring-in never re-enters it. The first bring-in or catalog delegation
 * creates the run's collaboration package (REQ-008); resolving alone never writes.
 */
export class AgentRunCollaborationRecipientResolver {
  constructor(private readonly options: Readonly<{
    taskScope(sender: CollaborationMemberExecutionIdentity): NonNullable<Parameters<typeof resolveMessageRecipient>[0]["taskScope"]>;
    getIndex(): AgentRunCollaborationExecutionIndex;
    collaborators: AgentRunCollaborationCollaborators;
  }>) {}

  /**
   * The one instance a message reaches: within the sender's own Team instance first
   * (REQ-007), then the host, a collaborator (a Team through its coordinator) or a
   * collaborator-Team member, then a catalog bring-in.
   */
  resolveMessageRecipient(sender: CollaborationMemberExecutionIdentity, addressInput: string): Promise<MessageRecipientResult> {
    return resolveMessageRecipient({
      taskScope: this.options.taskScope(sender),
      port: () => this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address: this.requireAddress(addressInput),
      catalog: { bringIn: (address) => this.options.collaborators.bringInAt({ address, senderRunId: sender.agentRunId }) },
      notFoundMessage: (address) => `Collaboration target '${address}' was not found in this Agent run.`,
    });
  }

  /** A catalog teammate, a collaborator (an extra copy, REQ-013), then a catalog copy. */
  resolveDelegationPlacement(sender: CollaborationMemberExecutionIdentity, addressInput: string): Promise<AgentRunCollaborationPlacement> {
    const address = this.requireAddress(addressInput);
    return resolveDelegationPlacement({
      port: this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address,
      resolveInRun: () => this.resolveInRunDelegationPlacement(address),
      catalogSource: () => this.options.collaborators.catalogTaskSource({ address, senderRunId: sender.agentRunId }),
    });
  }

  private resolveInRunDelegationPlacement(address: AgentTeamAddress): AgentRunCollaborationPlacement {
    const index = this.options.getIndex();
    const collaborator = index.getCollaborator(address);
    if (collaborator?.kind === "agent_team") {
      return Object.freeze({ kind: "agent_team", address: collaborator.address, coordinatorAddress: collaborator.coordinatorAddress });
    }
    const placement = index.getMessagePlacement(address);
    if (placement?.kind === "agent" && address !== index.hostAddress) return Object.freeze({ kind: "agent", address });
    throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", delegationTargetUnavailableMessage(address));
  }

  private requireAddress(addressInput: string): AgentTeamAddress {
    const address = assertAgentTeamAddress(addressInput);
    if (address === "/") {
      throw new CollaborationContractError("COLLABORATION_ADDRESS_INVALID", "The root '/' is structural and is not a recipient.");
    }
    return address;
  }
}
