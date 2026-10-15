import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { delegationTargetUnavailableMessage } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import { resolveDelegationPlacement } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import {
  resolveMessageRecipient,
  type CollaborationMessagePlacement,
} from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { StandaloneRootExecutionIndex } from "./standalone-root-execution-index.js";
import type { StandaloneRootCollaborators } from "./standalone-root-collaborators.js";
import type { StandaloneRootPlacement } from "./standalone-root-task-execution-adapter.js";

/**
 * Resolves Agent-root addresses by subject (DS-001, DS-002). Called inside the root operation
 * gate. The first catalog delegation creates the run's collaboration package (REQ-008); resolving
 * alone never writes.
 */
export class StandaloneRootRecipientResolver {
  constructor(private readonly options: Readonly<{
    getIndex(): StandaloneRootExecutionIndex;
    collaborators: StandaloneRootCollaborators;
  }>) {}

  /**
   * The one standing instance a message reaches: within the sender's own Team instance first
   * (REQ-007), then the host; anything else is not found (messaging never creates a run).
   */
  resolveMessageRecipient(sender: CollaborationMemberExecutionIdentity, addressInput: string): CollaborationMessagePlacement {
    return resolveMessageRecipient({
      port: () => this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address: this.requireAddress(addressInput),
    });
  }

  /** CM-1 refusal first, then a catalog copy (an Agent root has no other delegation target). */
  resolveDelegationPlacement(sender: CollaborationMemberExecutionIdentity, addressInput: string): Promise<StandaloneRootPlacement> {
    const address = this.requireAddress(addressInput);
    return resolveDelegationPlacement({
      port: this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address,
      resolveInRun: () => this.resolveInRunDelegationPlacement(address),
      catalogSource: () => this.options.collaborators.catalogTaskSource({ address, senderRunId: sender.agentRunId }),
    });
  }

  private resolveInRunDelegationPlacement(address: AgentTeamAddress): StandaloneRootPlacement {
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
