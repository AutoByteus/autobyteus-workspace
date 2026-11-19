import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { DelegationWork } from "../../model-routing/domain/model-routing-types.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { delegationTargetUnavailableMessage } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import { resolveDelegationPlacement } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import {
  resolveMessageRecipient,
  type CollaborationMessagePlacement,
} from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { DelegationPlacement } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import type { StandaloneRootIndex } from "./standalone-root-index.js";
import type { StandaloneRootCollaborators } from "./standalone-root-collaborators.js";

/** Resolves a standalone run's addresses (DS-001, DS-3), in the root's gate; resolving never writes. */
export class StandaloneRootRecipientResolver {
  constructor(private readonly options: Readonly<{
    getIndex(): StandaloneRootIndex;
    collaborators: StandaloneRootCollaborators;
  }>) {}

  /** Contract §2.3 in this run: its own agent (the self refusal) or nothing here (messaging never creates a run). */
  resolveMessageRecipient(sender: CollaborationMemberExecutionIdentity, addressInput: string): CollaborationMessagePlacement {
    return resolveMessageRecipient({
      port: () => this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address: this.requireAddress(addressInput),
    });
  }

  /** CM-1 refusal first, then a configured placement its address step 2 reaches (SR-059), then a catalog copy. */
  resolveDelegationPlacement(sender: CollaborationMemberExecutionIdentity, addressInput: string, work: DelegationWork, newDelegatedRunFolder: string | null): Promise<DelegationPlacement> {
    const address = this.requireAddress(addressInput);
    return resolveDelegationPlacement({
      port: this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address,
      newDelegatedRunFolder,
      resolveInRun: () => this.resolveInRunDelegationPlacement(address),
      catalogSource: (workspaceRootPath) => this.options.collaborators.catalogTaskSource({ address, senderRunId: sender.agentRunId, work, workspaceRootPath }),
    });
  }

  private async resolveInRunDelegationPlacement(address: AgentTeamAddress): Promise<DelegationPlacement> {
    const reached = await this.options.collaborators.reachedPlacementAt(address);
    if (reached) return reached;
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
